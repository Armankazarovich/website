export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const SITE_SCAN_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];
const MAX_HTML_CHARS = 2_000_000;

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string, maxLength: number) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).slice(0, maxLength);
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function cleanPublicUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (isBlockedHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function attr(source: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*([\"'])([\\s\\S]*?)\\1`, "i");
  return decodeHtml(source.match(pattern)?.[2] || "");
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byName = html.match(new RegExp(`<meta\\b(?=[^>]*(?:name|property)=[\"']${escaped}[\"'])[^>]*>`, "i"))?.[0] || "";
  return byName ? attr(byName, "content") : "";
}

function resolveAsset(value: string, baseUrl: string) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function unique(values: string[], limit: number) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

function findLogoCandidates(html: string, baseUrl: string) {
  const candidates: string[] = [
    meta(html, "og:image"),
    meta(html, "twitter:image"),
  ];

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = attr(tag, "rel").toLowerCase();
    if (rel.includes("icon") || rel.includes("apple-touch")) {
      candidates.push(attr(tag, "href"));
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const haystack = `${attr(tag, "src")} ${attr(tag, "alt")} ${attr(tag, "class")} ${attr(tag, "id")}`.toLowerCase();
    if (haystack.includes("logo") || haystack.includes("логотип")) {
      candidates.push(attr(tag, "src"));
    }
  }

  return unique(candidates.map((value) => resolveAsset(value, baseUrl)), 8);
}

function findPhones(text: string) {
  const phones = text.match(/(?:\+7|8)\s*\(?\d{3,4}\)?[\s-]*\d{2,3}[\s-]*\d{2}[\s-]*\d{2}/g) || [];
  return unique(phones.map((phone) => phone.replace(/\s+/g, " ")), 8);
}

function findEmails(text: string) {
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return unique(emails, 8);
}

function findSocialLinks(html: string, baseUrl: string) {
  const links: Array<{ label: string; url: string }> = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = resolveAsset(attr(match[0], "href"), baseUrl);
    const lower = href.toLowerCase();
    if (!href) continue;
    if (lower.includes("max.ru")) links.push({ label: "MAX", url: href });
    else if (lower.includes("wa.me") || lower.includes("whatsapp")) links.push({ label: "WhatsApp", url: href });
    else if (lower.includes("t.me") || lower.includes("telegram")) links.push({ label: "Telegram", url: href });
    else if (lower.includes("vk.com")) links.push({ label: "VK", url: href });
  }
  return unique(links.map((link) => `${link.label}|${link.url}`), 8).map((item) => {
    const [label, url] = item.split("|");
    return { label, url };
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!role || !SITE_SCAN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = getCurrentTenantId();
  const body = await req.json().catch(() => null);
  const supplierId = typeof body?.supplierId === "string" ? body.supplierId : "";
  const requestedUrl = cleanPublicUrl(body?.sourceUrl);
  if (!requestedUrl) return NextResponse.json({ error: "Укажите публичный http(s)-адрес сайта продавца" }, { status: 400 });

  const supplier = supplierId
    ? await prisma.supplier.findFirst({
        where: { id: supplierId, tenantId },
        select: { id: true, name: true, slug: true, website: true, sourceUrl: true },
      })
    : null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch(requestedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PiloRus seller scan preview (+https://pilo-rus.ru)",
        "Accept": "text/html,application/xhtml+xml",
        "Range": `bytes=0-${MAX_HTML_CHARS}`,
      },
      redirect: "follow",
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ error: "Не удалось открыть сайт продавца для preview" }, { status: 502 });
  }
  clearTimeout(timeout);

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) return NextResponse.json({ error: `Сайт вернул статус ${response.status}` }, { status: 502 });
  if (contentType && !contentType.toLowerCase().includes("text/html")) {
    return NextResponse.json({ error: "Preview сайта ожидает HTML-страницу" }, { status: 400 });
  }

  const html = (await response.text()).slice(0, MAX_HTML_CHARS);
  const finalUrl = response.url || requestedUrl;
  const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "", 160);
  const description = cleanText(meta(html, "description") || meta(html, "og:description"), 420);
  const siteName = cleanText(meta(html, "og:site_name") || title, 120);
  const visibleText = cleanText(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " "), 120_000);
  const logoCandidates = findLogoCandidates(html, finalUrl);
  const phoneCandidates = findPhones(visibleText);
  const emailCandidates = findEmails(visibleText);
  const socialLinks = findSocialLinks(html, finalUrl);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    previewOnly: true,
    supplier,
    sourceUrl: requestedUrl,
    fetchedUrl: finalUrl,
    title,
    siteName,
    description,
    logoCandidates,
    phoneCandidates,
    emailCandidates,
    socialLinks,
    storefrontDraft: {
      name: supplier?.name || siteName || title,
      website: supplier?.website || finalUrl,
      sourceUrl: requestedUrl,
      logoUrl: logoCandidates[0] || "",
      phone: phoneCandidates[0] || "",
      email: emailCandidates[0] || "",
      publicDescription: description,
    },
  });
}
