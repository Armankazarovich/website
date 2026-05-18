export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { buildArayDirectPackage } from "@/lib/aray-direct-package";

type ExternalFetchResult = {
  ok: boolean;
  status: number;
  url: string;
  contentType: string;
  text: string;
};

function normalizeOrigin(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d+)\./);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

function safeExternalOrigin(value: unknown) {
  const origin = normalizeOrigin(value);
  if (!origin) return "";
  const hostname = new URL(origin).hostname;
  return isPrivateHost(hostname) ? "" : origin;
}

async function fetchExternal(url: string): Promise<ExternalFetchResult> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "ARAY-Ads-Audit/1.0",
      Accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.5",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const text = (await response.text()).slice(0, 1_500_000);
  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    contentType,
    text,
  };
}

function textMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function extractTitle(html: string) {
  return (
    textMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    textMatch(html, /<title[^>]*>([^<]+)<\/title>/i)
  );
}

function extractDescription(html: string) {
  return (
    textMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    textMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
  );
}

function extractMetrikaCounters(html: string) {
  const counters = new Set<number>();
  for (const match of html.matchAll(/(?:ym\(|mc\.yandex\.ru\/watch\/)(\d{5,12})/gi)) {
    const id = Number(match[1]);
    if (Number.isInteger(id) && id > 0) counters.add(id);
  }
  return Array.from(counters);
}

function extractPhones(html: string) {
  const phones = new Set<string>();
  for (const match of html.matchAll(/(?:\+7|8)[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g)) {
    phones.add(match[0].replace(/\s+/g, " ").trim());
    if (phones.size >= 5) break;
  }
  return Array.from(phones);
}

function countFeedItems(xml: string) {
  const offers = xml.match(/<offer[\s>]/gi)?.length || 0;
  const prices = xml.match(/<price[\s>]/gi)?.length || 0;
  const pictures = xml.match(/<picture[\s>]/gi)?.length || 0;
  return {
    productCount: offers,
    productsWithPrice: Math.min(offers, prices),
    productsInStock: offers,
    productsWithImages: Math.min(offers, pictures),
  };
}

async function findFeed(origin: string, homepageHtml: string) {
  const candidates = new Set<string>();
  for (const match of homepageHtml.matchAll(/href=["']([^"']+(?:yml|feed|market|price)[^"']*\.(?:xml|yml)|[^"']*\/api\/yml[^"']*)["']/gi)) {
    try {
      candidates.add(new URL(match[1], origin).toString());
    } catch {
      // Ignore malformed external links.
    }
  }
  for (const path of ["/api/yml", "/yml.xml", "/feed.xml", "/market.xml", "/yandex.xml"]) {
    candidates.add(`${origin}${path}`);
  }

  for (const url of Array.from(candidates).slice(0, 8)) {
    try {
      const result = await fetchExternal(url);
      if (!result.ok) continue;
      if (/(<yml_catalog|<rss|<offer[\s>])/i.test(result.text)) {
        return {
          url,
          ...countFeedItems(result.text),
        };
      }
    } catch {
      // Candidate failed, keep checking.
    }
  }

  return {
    url: "",
    productCount: 0,
    productsWithPrice: 0,
    productsInStock: 0,
    productsWithImages: 0,
  };
}

async function buildExternalPackage(domain: string) {
  const origin = safeExternalOrigin(domain);
  if (!origin) {
    return NextResponse.json(
      { ok: false, error: "Укажите публичный домен: например example.ru" },
      { status: 400 },
    );
  }

  const homepage = await fetchExternal(origin);
  if (!homepage.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Сайт ответил HTTP ${homepage.status}. Для анализа нужен доступный публичный домен.`,
      },
      { status: 422 },
    );
  }

  const feed = await findFeed(origin, homepage.text);
  const metrikaCounterIds = extractMetrikaCounters(homepage.text);
  const businessName = extractTitle(homepage.text) || new URL(origin).hostname;
  const directPackage = buildArayDirectPackage({
    siteMode: "external-domain",
    domain: origin,
    businessName,
    directConnected: false,
    publicBaseUrlReady: true,
    regionIds: [],
    productCount: feed.productCount,
    productsWithPrice: feed.productsWithPrice,
    productsInStock: feed.productsInStock,
    productsWithImages: feed.productsWithImages,
    ymlUrl: feed.url,
    metrikaCounterIds,
    metrikaGoals: {},
    activeCampaignNames: [],
  });

  return NextResponse.json({
    ok: true,
    mode: "external-domain-audit",
    domain: origin,
    page: {
      title: businessName,
      description: extractDescription(homepage.text),
      finalUrl: homepage.url,
      phones: extractPhones(homepage.text),
      metrikaCounterIds,
    },
    feed,
    directPackage,
    next: "Подключить Direct-доступ владельца, регион, цели Метрики и подтвердить фид. После этого ARAY сможет собрать безопасный пакет черновиков.",
  });
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = new URL(req.url);
  const domain = url.searchParams.get("domain") || "";
  return buildExternalPackage(domain);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  return buildExternalPackage(body?.domain);
}
