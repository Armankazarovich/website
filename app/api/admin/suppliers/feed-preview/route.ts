export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const FEED_PREVIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];
const MAX_FEED_BYTES = 12 * 1024 * 1024;

type YmlCategory = {
  id: string;
  parentId: string;
  name: string;
};

type YmlOffer = {
  id: string;
  available: boolean;
  name: string;
  price: number;
  categoryId: string;
  category: string;
  url: string;
  picture: string;
  size: string;
  grade: string;
};

type LocalVariant = {
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string;
  variantId: string;
  size: string;
  sizeKey: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  tokens: string[];
  features: Set<string>;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function attrs(source: string) {
  const result: Record<string, string> = {};
  for (const match of source.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
    result[match[1]] = decodeXml(match[2]);
  }
  return result;
}

function textOf(source: string, tag: string) {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function parseYml(xml: string) {
  const catalogAttrs = attrs(xml.match(/<yml_catalog\b([^>]*)>/i)?.[1] || "");
  const shopName = textOf(xml, "name");
  const categories = new Map<string, YmlCategory>();

  for (const match of xml.matchAll(/<category\b([^>]*)>([\s\S]*?)<\/category>/gi)) {
    const categoryAttrs = attrs(match[1]);
    if (!categoryAttrs.id) continue;
    categories.set(categoryAttrs.id, {
      id: categoryAttrs.id,
      parentId: categoryAttrs.parentId || "",
      name: decodeXml(match[2]),
    });
  }

  const offers: YmlOffer[] = [];
  for (const match of xml.matchAll(/<offer\b([^>]*)>([\s\S]*?)<\/offer>/gi)) {
    const offerAttrs = attrs(match[1]);
    const body = match[2];
    const categoryId = textOf(body, "categoryId");
    const params: Record<string, string> = {};

    for (const param of body.matchAll(/<param\b([^>]*)>([\s\S]*?)<\/param>/gi)) {
      const paramAttrs = attrs(param[1]);
      if (paramAttrs.name) params[paramAttrs.name] = decodeXml(param[2]);
    }

    offers.push({
      id: offerAttrs.id || "",
      available: offerAttrs.available !== "false",
      name: textOf(body, "name"),
      price: Number(textOf(body, "price")),
      categoryId,
      category: categories.get(categoryId)?.name || "",
      url: textOf(body, "url"),
      picture: textOf(body, "picture"),
      size: params["Типоразмер (мм)"] || params["Размер"] || "",
      grade: params["Сорт"] || "",
    });
  }

  return {
    feedDate: catalogAttrs.date || "",
    shopName,
    categories: [...categories.values()],
    offers: offers.filter((offer) => offer.name && Number.isFinite(offer.price)),
  };
}

function normText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[×х]/g, "x")
    .replace(/[^a-zа-я0-9,.x\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: unknown) {
  const stop = new Set([
    "для",
    "или",
    "при",
    "это",
    "мм",
    "метр",
    "из",
    "по",
    "на",
    "акция",
    "цена",
    "цены",
    "купить",
    "москве",
    "московской",
    "области",
    "сорт",
    "гост",
    "ту",
  ]);
  return normText(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stop.has(token));
}

function normalizeSize(value: unknown) {
  const text = normText(value).replace(/,/g, ".");
  const full = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (full) return full.slice(1, 4).map((part) => String(Number(part))).join("x");
  const two = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s|$)/);
  if (two) return [two[1], two[2]].map((part) => String(Number(part))).join("x");
  return "";
}

function detectFeatures(value: unknown) {
  const text = normText(value);
  const features = new Set<string>();
  const add = (key: string, re: RegExp) => {
    if (re.test(text)) features.add(key);
  };
  add("brusok", /брусок/);
  add("brus", /брус(?!ок)/);
  add("doska", /доск/);
  add("vagonka", /вагонк/);
  add("planken", /планкен/);
  add("imitacia-brusa", /имитац.*брус/);
  add("block-house", /блок\s*-?\s*хаус/);
  add("fanera", /фанер/);
  add("osb", /\b(osb|осб)\b/);
  add("dsp", /\b(дсп|dsp)\b/);
  add("dvp", /\b(двп|dvp|оргалит)\b/);
  add("mdf", /\b(мдф|mdf)\b/);
  add("sosna", /сосн|ель|ел[ьиь]/);
  add("listv", /листвен/);
  add("kedr", /кедр/);
  add("osina", /осин/);
  add("lipa", /лип/);
  add("suhoy", /сух/);
  add("strogan", /строган|строганн/);
  add("obrez", /обрезн/);
  add("antisept", /антисепт/);
  add("gost", /гост/);
  add("tu", /\bту\b/);
  const grade = text.match(/(экстра|прима|ав|аб|\ba\b|\bb\b|\bc\b|\d\s*сорт)/);
  if (grade) features.add(`grade:${grade[1].replace(/\s+/g, "")}`);
  return features;
}

function firstFeature(features: Set<string>, values: string[]) {
  return values.find((value) => features.has(value)) || "";
}

function gradeFeature(features: Set<string>) {
  return [...features].find((feature) => feature.startsWith("grade:")) || "";
}

function mismatchPenalty(feedFeatures: Set<string>, localFeatures: Set<string>) {
  let penalty = 0;
  const woodValues = ["sosna", "listv", "kedr", "osina", "lipa"];
  const typeValues = ["imitacia-brusa", "block-house", "brusok", "brus", "doska", "vagonka", "planken", "fanera", "osb", "dsp", "dvp", "mdf"];
  const feedWood = firstFeature(feedFeatures, woodValues);
  const localWood = firstFeature(localFeatures, woodValues);
  if (feedWood && localWood && feedWood !== localWood) penalty += 36;
  const feedType = firstFeature(feedFeatures, typeValues);
  const localType = firstFeature(localFeatures, typeValues);
  if (feedType && localType && feedType !== localType) penalty += 30;
  const feedGrade = gradeFeature(feedFeatures);
  const localGrade = gradeFeature(localFeatures);
  if (feedGrade && localGrade && feedGrade !== localGrade) penalty += 12;
  return penalty;
}

function featureScore(feedFeatures: Set<string>, localFeatures: Set<string>) {
  let score = 0;
  for (const feature of feedFeatures) {
    if (localFeatures.has(feature)) score += feature.startsWith("grade:") ? 10 : 8;
  }
  return score;
}

function tokenScore(feedTokens: string[], localTokens: string[]) {
  const local = new Set(localTokens);
  let hits = 0;
  for (const token of feedTokens) if (local.has(token)) hits++;
  return hits * 2;
}

function confidenceFromScore(score: number) {
  if (score >= 78) return "high";
  if (score >= 58) return "medium";
  if (score >= 40) return "low";
  return "unmatched";
}

function priceDiff(feedPrice: number, localPrice: number | null) {
  if (!localPrice || localPrice <= 0) return null;
  return Math.round(((feedPrice - localPrice) / localPrice) * 1000) / 10;
}

function bestPriceComparison(feedPrice: number, pricePerCube: number | null, pricePerPiece: number | null) {
  const candidates = [
    { unit: "m3", price: pricePerCube, diffPct: priceDiff(feedPrice, pricePerCube) },
    { unit: "piece", price: pricePerPiece, diffPct: priceDiff(feedPrice, pricePerPiece) },
  ].filter((item): item is { unit: string; price: number; diffPct: number } => item.diffPct !== null && item.price !== null);
  candidates.sort((a, b) => Math.abs(a.diffPct) - Math.abs(b.diffPct));
  return candidates[0] || { unit: "", price: null, diffPct: null };
}

async function checkAccess() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return Boolean(session && role && FEED_PREVIEW_ROLES.includes(role));
}

function cleanFeedUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchFeed(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "ARAY-PiloRus-VendorFeedPreview/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_FEED_BYTES) throw new Error("feed-too-large");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_FEED_BYTES) throw new Error("feed-too-large");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function topCategories(rows: Array<{ confidence: string; category: string }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.confidence !== "unmatched") continue;
    const key = row.category || "Без категории";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));
}

export async function POST(req: Request) {
  if (!(await checkAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const feedUrl = cleanFeedUrl(body.feedUrl);
  if (!feedUrl) return NextResponse.json({ error: "Укажите корректную ссылку на YML/XML feed" }, { status: 400 });

  const tenantId = getCurrentTenantId();
  const supplierId = typeof body.supplierId === "string" ? body.supplierId.trim() : "";
  const supplier = supplierId
    ? await prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true, name: true, slug: true } })
    : null;
  if (supplierId && !supplier) return NextResponse.json({ error: "Продавец не найден" }, { status: 404 });

  let xml: string;
  try {
    xml = await fetchFeed(feedUrl);
  } catch (error: any) {
    const text = error?.message === "feed-too-large" ? "Feed слишком большой для безопасного preview" : `Feed не загрузился: ${error?.message || "ошибка сети"}`;
    return NextResponse.json({ error: text }, { status: 400 });
  }

  const feed = parseYml(xml);
  const products = await prisma.product.findMany({
    where: { tenantId, active: true },
    include: { category: true, variants: true },
    orderBy: { name: "asc" },
  });

  const variants: LocalVariant[] = [];
  for (const product of products) {
    for (const variant of product.variants) {
      const haystack = `${product.name} ${product.category?.name || ""} ${variant.size || ""}`;
      variants.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categoryName: product.category?.name || "",
        variantId: variant.id,
        size: variant.size || "",
        sizeKey: normalizeSize(variant.size),
        pricePerCube: variant.pricePerCube === null ? null : Number(variant.pricePerCube),
        pricePerPiece: variant.pricePerPiece === null ? null : Number(variant.pricePerPiece),
        tokens: tokens(haystack),
        features: detectFeatures(haystack),
      });
    }
  }

  const bySize = new Map<string, LocalVariant[]>();
  for (const variant of variants) {
    if (!variant.sizeKey) continue;
    if (!bySize.has(variant.sizeKey)) bySize.set(variant.sizeKey, []);
    bySize.get(variant.sizeKey)?.push(variant);
  }

  const rows = feed.offers.map((offer) => {
    const haystack = `${offer.name} ${offer.category} ${offer.grade} ${offer.size}`;
    const sizeKey = normalizeSize(offer.size || offer.name);
    const offerTokens = tokens(haystack);
    const offerFeatures = detectFeatures(haystack);
    const candidatePool = sizeKey && bySize.has(sizeKey) ? bySize.get(sizeKey)! : variants;
    const candidates = candidatePool
      .map((variant) => {
        const sameSize = sizeKey && variant.sizeKey === sizeKey;
        const rawScore = (sameSize ? 45 : 0) + featureScore(offerFeatures, variant.features) + tokenScore(offerTokens, variant.tokens);
        const score = Math.max(0, rawScore - mismatchPenalty(offerFeatures, variant.features));
        return { variant, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const best = candidates[0];
    const confidence = confidenceFromScore(best?.score || 0);
    const price = best && confidence !== "unmatched" ? bestPriceComparison(offer.price, best.variant.pricePerCube, best.variant.pricePerPiece) : { unit: "", price: null, diffPct: null };

    return {
      feedId: offer.id,
      name: offer.name,
      price: offer.price,
      category: offer.category,
      size: offer.size,
      url: offer.url,
      picture: offer.picture,
      confidence,
      score: best?.score || 0,
      matchedProduct: best && confidence !== "unmatched" ? best.variant.productName : "",
      matchedSlug: best && confidence !== "unmatched" ? best.variant.productSlug : "",
      matchedVariantId: best && confidence !== "unmatched" ? best.variant.variantId : "",
      matchedVariantSize: best && confidence !== "unmatched" ? best.variant.size : "",
      compareUnit: price.unit,
      piloComparedPrice: price.price,
      diffVsPiloBestUnitPct: price.diffPct,
      candidates: candidates.map((candidate) => ({
        score: candidate.score,
        product: candidate.variant.productName,
        slug: candidate.variant.productSlug,
        size: candidate.variant.size,
        pricePerCube: candidate.variant.pricePerCube,
        pricePerPiece: candidate.variant.pricePerPiece,
      })),
    };
  });

  const matchCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.confidence] = (acc[row.confidence] || 0) + 1;
    return acc;
  }, {});
  const high = rows.filter((row) => row.confidence === "high");
  const medium = rows.filter((row) => row.confidence === "medium");
  const low = rows.filter((row) => row.confidence === "low");
  const unmatched = rows.filter((row) => row.confidence === "unmatched");
  const diffs = high.map((row) => row.diffVsPiloBestUnitPct).filter((value): value is number => value !== null && Number.isFinite(value));
  const avgDiff = diffs.length ? Math.round((diffs.reduce((sum, value) => sum + value, 0) / diffs.length) * 10) / 10 : null;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    supplier,
    source: feedUrl,
    shop: feed.shopName,
    feedDate: feed.feedDate,
    feedOffers: rows.length,
    feedCategories: feed.categories.length,
    localActiveProducts: products.length,
    localVariants: variants.length,
    offersWithParsedSize: rows.filter((row) => normalizeSize(row.size || row.name)).length,
    matchCounts: {
      high: matchCounts.high || 0,
      medium: matchCounts.medium || 0,
      low: matchCounts.low || 0,
      unmatched: matchCounts.unmatched || 0,
    },
    avgHighMatchPriceDiffVsPiloBestUnitPct: avgDiff,
    unmatchedCategories: topCategories(rows),
    samples: {
      high: high.slice(0, 8),
      medium: medium.slice(0, 8),
      low: low.slice(0, 6),
      unmatched: unmatched.slice(0, 8),
    },
  });
}
