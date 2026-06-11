import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { slugify } from "@/lib/slug";
import {
  isStoreConstructorBusinessType,
  type StoreConstructorBusinessType,
} from "@/lib/store-constructor-blueprints";

export type AraySourceSiteScan = {
  sourceUrl: string;
  finalUrl: string;
  domain: string;
  title: string;
  description: string;
  businessType: StoreConstructorBusinessType;
  confidence: "ready" | "needs-brief";
  contacts: {
    phones: string[];
    emails: string[];
  };
  products: string[];
  categories: string[];
  promotions: string[];
  images: Array<{
    src: string;
    alt: string;
  }>;
  links: Array<{
    href: string;
    text: string;
    kind: "catalog" | "product" | "service" | "promotion" | "contact" | "other";
  }>;
  signals: string[];
  warnings: string[];
  nextSteps: string[];
  fetchedAt: string;
};

type HtmlLink = {
  href: string;
  text: string;
  kind: AraySourceSiteScan["links"][number]["kind"];
};

const MAX_HTML_LENGTH = 750_000;
const MAX_RESULT_ITEMS = 18;

function cleanText(value: unknown, maxLength = 240): string {
  return typeof value === "string"
    ? decodeHtml(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function uniqueList(items: string[], limit = MAX_RESULT_ITEMS): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const clean = cleanText(item, 160);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= limit) break;
  }

  return result;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value: string): string {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] || match[3] || match[4] || "");
  }

  return attrs;
}

function getMeta(html: string, names: string[]): string {
  const lowerNames = new Set(names.map((name) => name.toLowerCase()));
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const attrs = parseAttrs(tag);
    const key = (attrs.name || attrs.property || "").toLowerCase();
    if (lowerNames.has(key) && attrs.content) return cleanText(attrs.content, 500);
  }

  return "";
}

function getTitle(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return cleanText(title, 160);
}

function normalizeInputUrl(value: string): URL {
  const raw = value.trim();
  if (!raw) throw new Error("Введите домен или ссылку");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("ARAY принимает только обычные http/https ссылки");
  }
  url.hash = "";
  return url;
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80")) return true;
  if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.replace("::ffff:", ""));

  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) return false;
  const [a, b] = normalized.split(".").map((part) => Number(part));
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function assertPublicHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Этот адрес служебный. Дайте публичный домен клиента.");
  }

  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Локальные и внутренние IP нельзя сканировать из админки.");
    return;
  }

  const records = await lookup(host, { all: true }).catch(() => []);
  if (records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Домен ведет во внутреннюю сеть. Дайте публичный сайт клиента.");
  }
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function classifyLink(href: string, text: string): HtmlLink["kind"] {
  const source = `${href} ${text}`.toLowerCase();
  if (/(promo|promotion|sale|discount|offer|special|акц|скид|распродаж|предложени|выгод)/i.test(source)) return "promotion";
  if (/(catalog|katalog|shop|store|collection|category|products|товар|каталог|price|прайс)/i.test(source)) return "catalog";
  if (/(product|item|sku|card|tovar|produkt|товар\/|product\/)/i.test(source)) return "product";
  if (/(service|uslug|услуг|сервис|work|portfolio)/i.test(source)) return "service";
  if (/(contact|kontakty|контакт|phone|tel:|mailto:|address)/i.test(source)) return "contact";
  return "other";
}

function extractLinks(html: string, baseUrl: string): HtmlLink[] {
  const links: HtmlLink[] = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const attrs = parseAttrs(match[1]);
    const href = attrs.href ? toAbsoluteUrl(attrs.href, baseUrl) : "";
    const text = cleanText(stripTags(match[2]), 120);
    if (!href || (!text && !/(catalog|product|shop|service|contact)/i.test(href))) continue;
    links.push({ href, text: text || new URL(href).pathname, kind: classifyLink(href, text) });
    if (links.length >= 80) break;
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.href}|${link.text}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 32);
}

function extractImages(html: string, baseUrl: string): AraySourceSiteScan["images"] {
  const images: AraySourceSiteScan["images"] = [];
  const ogImage = getMeta(html, ["og:image", "twitter:image"]);
  if (ogImage) images.push({ src: toAbsoluteUrl(ogImage, baseUrl), alt: "главное изображение" });

  const pattern = /<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const attrs = parseAttrs(match[1]);
    const src = toAbsoluteUrl(attrs.src || attrs["data-src"] || attrs["data-original"] || "", baseUrl);
    if (!src) continue;
    images.push({ src, alt: cleanText(attrs.alt || "", 100) });
    if (images.length >= MAX_RESULT_ITEMS) break;
  }

  const seen = new Set<string>();
  return images.filter((image) => {
    if (!image.src || seen.has(image.src)) return false;
    seen.add(image.src);
    return true;
  }).slice(0, 12);
}

function extractJsonLd(html: string): unknown[] {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const values: unknown[] = [];

  for (const script of scripts.slice(0, 8)) {
    const json = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      values.push(JSON.parse(decodeHtml(json)));
    } catch {
      // JSON-LD often contains vendor comments or broken markup; the visible HTML still gives us enough signal.
    }
  }

  return values;
}

function walkJson(value: unknown, visitor: (node: Record<string, unknown>) => void) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  visitor(record);
  Object.values(record).forEach((item) => walkJson(item, visitor));
}

function typeIncludes(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value.toLowerCase().includes(expected.toLowerCase());
  if (Array.isArray(value)) return value.some((item) => typeIncludes(item, expected));
  return false;
}

function extractStructuredSignals(jsonLd: unknown[]) {
  const products: string[] = [];
  const categories: string[] = [];
  const signals: string[] = [];

  for (const root of jsonLd) {
    walkJson(root, (node) => {
      const type = node["@type"];
      if (typeIncludes(type, "Product")) {
        products.push(cleanText(node.name, 160));
        categories.push(cleanText(node.category, 120));
        signals.push("JSON-LD товар");
      }
      if (typeIncludes(type, "ItemList")) signals.push("список товаров или услуг");
      if (typeIncludes(type, "Organization") || typeIncludes(type, "LocalBusiness")) signals.push("данные компании");
      if (typeIncludes(type, "WebSite")) signals.push("структура сайта");
    });
  }

  return {
    products: uniqueList(products, 12),
    categories: uniqueList(categories, 10),
    signals: uniqueList(signals, 8),
  };
}

function extractContacts(text: string) {
  const phones = uniqueList(
    Array.from(text.matchAll(/(?:\+?\d[\d\s().-]{8,}\d)/g)).map((match) => match[0]),
    6,
  );
  const emails = uniqueList(
    Array.from(text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)).map((match) => match[0]),
    6,
  );
  return { phones, emails };
}

function inferBusinessType(input: {
  title: string;
  description: string;
  links: HtmlLink[];
  products: string[];
  categories: string[];
}): StoreConstructorBusinessType {
  const text = [
    input.title,
    input.description,
    ...input.links.map((link) => `${link.href} ${link.text}`),
    ...input.products,
    ...input.categories,
  ].join(" ").toLowerCase();

  if (/(пиломат|лес|доск|брус|фанер|lumber|timber|wood)/i.test(text)) return "lumber";
  if (/(строй|строител|ремонт|материал|кирпич|бетон|construction|building)/i.test(text)) return "construction";
  if (/(ресторан|кафе|еда|меню|доставка еды|restaurant|cafe|food|menu)/i.test(text)) return "restaurant";
  if (/(салон|красот|барбер|космет|beauty|barber|spa)/i.test(text)) return "beauty";
  if (/(услуг|сервис|студия|агентство|маркетинг|service|agency|studio|consulting)/i.test(text)) return "services";
  if (/(магазин|товар|каталог|корзин|shop|store|catalog|product|retail)/i.test(text)) return "retail";
  return "universal";
}

function inferCategories(links: HtmlLink[], structuredCategories: string[]): string[] {
  const fromLinks = links
    .filter((link) => link.kind === "catalog" || link.kind === "service")
    .map((link) => link.text)
    .filter((text) => text.length >= 3 && text.length <= 80);

  return uniqueList([...structuredCategories, ...fromLinks], 12);
}

function inferProducts(links: HtmlLink[], structuredProducts: string[], title: string): string[] {
  const fromLinks = links
    .filter((link) => link.kind === "product")
    .map((link) => link.text)
    .filter((text) => text.length >= 3 && text.length <= 100);

  return uniqueList([...structuredProducts, ...fromLinks, title], 12);
}

function inferPromotions(links: HtmlLink[]): string[] {
  return uniqueList(
    links
      .filter((link) => link.kind === "promotion")
      .map((link) => link.text)
      .filter((text) => text.length >= 3 && text.length <= 100),
    8,
  );
}

function buildWarnings(input: {
  title: string;
  description: string;
  products: string[];
  categories: string[];
  images: AraySourceSiteScan["images"];
  contacts: AraySourceSiteScan["contacts"];
}) {
  const warnings: string[] = [];
  if (!input.title) warnings.push("не нашли понятный заголовок сайта");
  if (!input.description) warnings.push("не нашли SEO-описание");
  if (input.products.length === 0 && input.categories.length === 0) warnings.push("товары или услуги нужно подтвердить вручную");
  if (input.images.length === 0) warnings.push("фото лучше добавить из материалов клиента");
  if (input.contacts.phones.length === 0 && input.contacts.emails.length === 0) warnings.push("контакты нужно уточнить в брифе");
  return warnings;
}

export async function scanAraySourceSite(rawUrl: string): Promise<AraySourceSiteScan> {
  const source = normalizeInputUrl(rawUrl);
  await assertPublicHostname(source.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(source.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "ARAY-Site-Import/1.0 (+https://aray-cms.local)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Сайт ответил ошибкой ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("По этой ссылке не HTML-страница. Дайте главную страницу сайта.");
    }

    const html = (await response.text()).slice(0, MAX_HTML_LENGTH);
    const finalUrl = response.url || source.toString();
    const title = getMeta(html, ["og:title", "twitter:title"]) || getTitle(html);
    const description = getMeta(html, ["description", "og:description", "twitter:description"]);
    const plainText = stripTags(html).slice(0, 80_000);
    const links = extractLinks(html, finalUrl);
    const images = extractImages(html, finalUrl);
    const structured = extractStructuredSignals(extractJsonLd(html));
    const categories = inferCategories(links, structured.categories);
    const products = inferProducts(links, structured.products, title);
    const promotions = inferPromotions(links);
    const contacts = extractContacts(plainText);
    const businessType = inferBusinessType({ title, description, links, products, categories });
    const signals = uniqueList([
      ...structured.signals,
      links.some((link) => link.kind === "catalog") ? "каталог или витрина" : "",
      links.some((link) => link.kind === "service") ? "услуги" : "",
      links.some((link) => link.kind === "promotion") ? "акции или предложения" : "",
      links.some((link) => link.kind === "contact") ? "контакты" : "",
      images.length > 0 ? "изображения для первого сайта" : "",
      contacts.phones.length > 0 ? "телефон найден" : "",
    ], 10);
    const warnings = buildWarnings({ title, description, products, categories, images, contacts });
    const confidence = warnings.length <= 2 && (products.length > 0 || categories.length > 0) ? "ready" : "needs-brief";
    const domain = new URL(finalUrl).hostname.replace(/^www\./, "");

    return {
      sourceUrl: source.toString(),
      finalUrl,
      domain,
      title: title || domain,
      description,
      businessType: isStoreConstructorBusinessType(businessType) ? businessType : "universal",
      confidence,
      contacts,
      products,
      categories,
      promotions,
      images,
      links: links.slice(0, 18),
      signals,
      warnings,
      nextSteps: [
        "проверить название и сферу бизнеса",
        "подтвердить товары, услуги, акции и категории",
        "выбрать фото и цвет бренда",
        "собрать сайт ARAY CMS и открыть проверку",
      ],
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildArayImportedSiteSlug(scan: Pick<AraySourceSiteScan, "domain" | "title">): string {
  const base = slugify(scan.domain || scan.title || "client-site").slice(0, 28) || "client-site";
  const source = `${scan.domain}:${scan.title}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  const suffix = Math.abs(hash).toString(36).slice(0, 6) || Date.now().toString(36).slice(-6);
  return `aray-${base}-${suffix}`.slice(0, 40).replace(/-+$/g, "");
}
