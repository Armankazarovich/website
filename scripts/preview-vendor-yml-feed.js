/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function download(url) {
  const client = url.startsWith("https:") ? https : http;
  return new Promise((resolve, reject) => {
    client
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(new URL(res.headers.location, url).toString()).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Feed download failed: HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function attrs(source) {
  const result = {};
  for (const match of source.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
    result[match[1]] = decodeXml(match[2]);
  }
  return result;
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function textOf(source, tag) {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function allTextOf(source, tag) {
  return [...source.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((match) => decodeXml(match[1]));
}

function parseYml(xml) {
  const feedDate = attrs(xml.match(/<yml_catalog\b([^>]*)>/i)?.[1] || "").date || "";
  const shop = textOf(xml, "name");
  const categories = new Map();
  for (const match of xml.matchAll(/<category\b([^>]*)>([\s\S]*?)<\/category>/gi)) {
    const categoryAttrs = attrs(match[1]);
    if (!categoryAttrs.id) continue;
    categories.set(categoryAttrs.id, {
      id: categoryAttrs.id,
      parentId: categoryAttrs.parentId || "",
      name: decodeXml(match[2]),
    });
  }

  const offers = [];
  for (const match of xml.matchAll(/<offer\b([^>]*)>([\s\S]*?)<\/offer>/gi)) {
    const offerAttrs = attrs(match[1]);
    const body = match[2];
    const params = {};
    for (const param of body.matchAll(/<param\b([^>]*)>([\s\S]*?)<\/param>/gi)) {
      const paramAttrs = attrs(param[1]);
      if (paramAttrs.name) params[paramAttrs.name] = decodeXml(param[2]);
    }
    const categoryId = textOf(body, "categoryId");
    offers.push({
      id: offerAttrs.id || "",
      available: offerAttrs.available !== "false",
      name: textOf(body, "name"),
      price: Number(textOf(body, "price")),
      currencyId: textOf(body, "currencyId"),
      categoryId,
      category: categories.get(categoryId)?.name || "",
      description: textOf(body, "description"),
      url: textOf(body, "url"),
      vendorCode: textOf(body, "vendorCode"),
      pictures: allTextOf(body, "picture"),
      size: params["Типоразмер (мм)"] || params["Размер"] || "",
      grade: params["Сорт"] || "",
      params,
    });
  }
  return { feedDate, shop, categories: [...categories.values()], offers };
}

function normText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[×х]/g, "x")
    .replace(/[^a-zа-я0-9,.x\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
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

function normalizeSize(value) {
  const text = normText(value).replace(/,/g, ".");
  const full = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (full) return full.slice(1, 4).map((part) => String(Number(part))).join("x");
  const two = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s|$)/);
  if (two) return [two[1], two[2]].map((part) => String(Number(part))).join("x");
  return "";
}

function detectFeatures(value) {
  const text = normText(value);
  const features = new Set();
  const add = (key, re) => {
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

function featureScore(a, b) {
  let score = 0;
  for (const feature of a) {
    if (b.has(feature)) score += feature.startsWith("grade:") ? 10 : 8;
  }
  return score;
}

function firstFeature(features, values) {
  return values.find((value) => features.has(value)) || "";
}

function gradeFeature(features) {
  return [...features].find((feature) => feature.startsWith("grade:")) || "";
}

function mismatchPenalty(a, b) {
  let penalty = 0;
  const woodValues = ["sosna", "listv", "kedr", "osina", "lipa"];
  const typeValues = ["imitacia-brusa", "block-house", "brusok", "brus", "doska", "vagonka", "planken", "fanera", "osb", "dsp", "dvp", "mdf"];
  const aWood = firstFeature(a, woodValues);
  const bWood = firstFeature(b, woodValues);
  if (aWood && bWood && aWood !== bWood) penalty += 36;
  const aType = firstFeature(a, typeValues);
  const bType = firstFeature(b, typeValues);
  if (aType && bType && aType !== bType) penalty += 30;
  const aGrade = gradeFeature(a);
  const bGrade = gradeFeature(b);
  if (aGrade && bGrade && aGrade !== bGrade) penalty += 12;
  return penalty;
}

function tokenScore(aTokens, bTokens) {
  const b = new Set(bTokens);
  let hits = 0;
  for (const token of aTokens) {
    if (b.has(token)) hits++;
  }
  return hits * 2;
}

function priceDiff(feedPrice, piloPrice) {
  const fp = Number(feedPrice);
  const pp = Number(piloPrice);
  if (!Number.isFinite(fp) || !Number.isFinite(pp) || pp <= 0) return null;
  return Math.round(((fp - pp) / pp) * 1000) / 10;
}

function bestPriceComparison(feedPrice, pricePerCube, pricePerPiece) {
  const candidates = [
    { unit: "m3", price: pricePerCube, diffPct: priceDiff(feedPrice, pricePerCube) },
    { unit: "piece", price: pricePerPiece, diffPct: priceDiff(feedPrice, pricePerPiece) },
  ].filter((item) => item.diffPct !== null);
  if (candidates.length === 0) return { unit: "", price: null, diffPct: null };
  candidates.sort((a, b) => Math.abs(a.diffPct) - Math.abs(b.diffPct));
  return candidates[0];
}

function confidenceFromScore(score) {
  if (score >= 78) return "high";
  if (score >= 58) return "medium";
  if (score >= 40) return "low";
  return "unmatched";
}

function escapeMd(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function main() {
  const args = parseArgs(process.argv);
  const tenantId = args.tenant || "pilorus";
  const supplier = args.supplier || "vendor";
  const sourceUrl = args.url || "";
  const outDir = args.out || "tmp";

  if (!args.file && !sourceUrl) {
    throw new Error("Use --file path/to/feed.xml or --url https://example.com/feed.xml");
  }

  const xml = args.file ? fs.readFileSync(args.file, "utf8") : await download(sourceUrl);
  fs.mkdirSync(outDir, { recursive: true });
  if (!args.file && sourceUrl) {
    fs.writeFileSync(path.join(outDir, `${supplier}-feed.xml`), xml, "utf8");
  }

  const feed = parseYml(xml);
  const products = await prisma.product.findMany({
    where: { tenantId, active: true },
    include: { category: true, variants: true },
    orderBy: { name: "asc" },
  });

  const variants = [];
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
        pricePerCube: variant.pricePerCube == null ? null : Number(variant.pricePerCube),
        pricePerPiece: variant.pricePerPiece == null ? null : Number(variant.pricePerPiece),
        tokens: tokens(haystack),
        features: detectFeatures(haystack),
      });
    }
  }

  const bySize = new Map();
  for (const variant of variants) {
    if (!variant.sizeKey) continue;
    if (!bySize.has(variant.sizeKey)) bySize.set(variant.sizeKey, []);
    bySize.get(variant.sizeKey).push(variant);
  }

  const rows = [];
  for (const offer of feed.offers) {
    const haystack = `${offer.name || ""} ${offer.category || ""} ${offer.grade || ""} ${offer.size || ""}`;
    const sizeKey = normalizeSize(offer.size || offer.name || "");
    const offerTokens = tokens(haystack);
    const offerFeatures = detectFeatures(haystack);
    const candidatePool = sizeKey && bySize.has(sizeKey) ? bySize.get(sizeKey) : variants;
    const candidates = candidatePool
      .map((variant) => {
        const sameSize = sizeKey && variant.sizeKey === sizeKey;
        const rawScore = (sameSize ? 45 : 0) + featureScore(offerFeatures, variant.features) + tokenScore(offerTokens, variant.tokens);
        const score = Math.max(0, rawScore - mismatchPenalty(offerFeatures, variant.features));
        return { variant, score, sameSize };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const best = candidates[0];
    const confidence = confidenceFromScore(best?.score || 0);
    const bestPrice =
      best && confidence !== "unmatched"
        ? bestPriceComparison(offer.price, best.variant.pricePerCube, best.variant.pricePerPiece)
        : { unit: "", price: null, diffPct: null };
    rows.push({
      feedId: offer.id,
      available: offer.available,
      name: offer.name,
      price: offer.price,
      category: offer.category,
      categoryId: offer.categoryId,
      size: offer.size,
      grade: offer.grade,
      sizeKey,
      url: offer.url,
      picture: offer.pictures[0] || "",
      confidence,
      score: best?.score || 0,
      matchedProduct: best && confidence !== "unmatched" ? best.variant.productName : "",
      matchedSlug: best && confidence !== "unmatched" ? best.variant.productSlug : "",
      matchedVariantId: best && confidence !== "unmatched" ? best.variant.variantId : "",
      matchedVariantSize: best && confidence !== "unmatched" ? best.variant.size : "",
      piloPricePerCube: best && confidence !== "unmatched" ? best.variant.pricePerCube : null,
      piloPricePerPiece: best && confidence !== "unmatched" ? best.variant.pricePerPiece : null,
      diffVsPiloCubePct: best && confidence !== "unmatched" ? priceDiff(offer.price, best.variant.pricePerCube) : null,
      compareUnit: bestPrice.unit,
      piloComparedPrice: bestPrice.price,
      diffVsPiloBestUnitPct: bestPrice.diffPct,
      candidates: candidates.map((candidate) => ({
        score: candidate.score,
        product: candidate.variant.productName,
        slug: candidate.variant.productSlug,
        size: candidate.variant.size,
        pricePerCube: candidate.variant.pricePerCube,
      })),
    });
  }

  const matchCounts = rows.reduce((acc, row) => {
    acc[row.confidence] = (acc[row.confidence] || 0) + 1;
    return acc;
  }, {});
  const high = rows.filter((row) => row.confidence === "high");
  const medium = rows.filter((row) => row.confidence === "medium");
  const low = rows.filter((row) => row.confidence === "low");
  const unmatched = rows.filter((row) => row.confidence === "unmatched");
  const diffs = high.map((row) => row.diffVsPiloBestUnitPct).filter((value) => value !== null && Number.isFinite(value));
  const avgDiff = diffs.length ? Math.round((diffs.reduce((sum, value) => sum + value, 0) / diffs.length) * 10) / 10 : null;

  const report = {
    generatedAt: new Date().toISOString(),
    tenantId,
    supplier,
    source: sourceUrl || args.file,
    shop: feed.shop,
    feedDate: feed.feedDate,
    feedOffers: rows.length,
    feedCategories: feed.categories.length,
    localActiveProducts: products.length,
    localVariants: variants.length,
    offersWithParsedSize: rows.filter((row) => row.sizeKey).length,
    matchCounts,
    avgHighMatchPriceDiffVsPiloBestUnitPct: avgDiff,
    highSamples: high.slice(0, 15),
    mediumSamples: medium.slice(0, 25),
    lowSamples: low.slice(0, 25),
    unmatchedSamples: unmatched.slice(0, 40),
    rows,
  };

  const jsonPath = path.join(outDir, `${supplier}-feed-preview.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const md = [];
  md.push(`# ${supplier} YML feed preview`);
  md.push("");
  md.push(`Source: ${sourceUrl || args.file}`);
  md.push(`Feed date: ${feed.feedDate || "unknown"}`);
  md.push(`Shop: ${feed.shop || "unknown"}`);
  md.push(`Offers: ${rows.length}`);
  md.push(`Categories: ${feed.categories.length}`);
  md.push(`Local active products: ${products.length}`);
  md.push(`Local variants checked: ${variants.length}`);
  md.push(`Offers with parsed size: ${report.offersWithParsedSize}`);
  md.push("");
  md.push("## Match counts");
  for (const key of ["high", "medium", "low", "unmatched"]) md.push(`- ${key}: ${matchCounts[key] || 0}`);
  md.push(`- avg high-match price diff vs nearest PiloRus unit: ${avgDiff === null ? "n/a" : `${avgDiff}%`}`);
  md.push("");
  md.push("## High confidence samples");
  md.push("| Feed item | Match | Pilmos price | PiloRus compare | Unit | Diff |");
  md.push("| --- | --- | ---: | ---: | --- | ---: |");
  for (const row of high.slice(0, 25)) {
    md.push(
      `| ${escapeMd(row.name)} | ${escapeMd(`${row.matchedProduct} / ${row.matchedVariantSize}`)} | ${row.price || ""} | ${row.piloComparedPrice || ""} | ${
        row.compareUnit || ""
      } | ${
        row.diffVsPiloBestUnitPct ?? ""
      }% |`,
    );
  }
  md.push("");
  md.push("## Needs review samples");
  md.push("| Level | Feed item | Best candidate | Score |");
  md.push("| --- | --- | --- | ---: |");
  for (const row of [...medium.slice(0, 20), ...low.slice(0, 15), ...unmatched.slice(0, 15)]) {
    const candidate = row.candidates[0];
    md.push(
      `| ${row.confidence} | ${escapeMd(row.name)} | ${candidate ? escapeMd(`${candidate.product} / ${candidate.size}`) : ""} | ${
        candidate?.score || 0
      } |`,
    );
  }
  const mdPath = path.join(outDir, `${supplier}-feed-preview.md`);
  fs.writeFileSync(mdPath, md.join("\n"), "utf8");

  console.log(
    JSON.stringify(
      {
        source: report.source,
        feedOffers: report.feedOffers,
        feedCategories: report.feedCategories,
        localActiveProducts: report.localActiveProducts,
        localVariants: report.localVariants,
        offersWithParsedSize: report.offersWithParsedSize,
        matchCounts: report.matchCounts,
        avgHighMatchPriceDiffVsPiloBestUnitPct: report.avgHighMatchPriceDiffVsPiloBestUnitPct,
        previewJson: jsonPath,
        previewMd: mdPath,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(`[vendor-feed-preview] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
