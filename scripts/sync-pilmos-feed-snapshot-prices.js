/* eslint-disable no-console */
const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");

const DEFAULT_FEED_URL = "https://pilmos.ru/wp-content/uploads/feed001.xml";
const DEFAULT_FEED_FILE = "tmp/pilmos-feed001.xml";
const DEFAULT_SNAPSHOT = "prisma/catalog/pilmos-catalog-2026-06-14.json";
const DEFAULT_REPORT = "tmp/pilmos-feed-price-sync-report.json";
const PRICE_DELTA_RUB = 10;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function parseArgs(argv) {
  const args = {
    feed: DEFAULT_FEED_FILE,
    snapshot: DEFAULT_SNAPSHOT,
    report: DEFAULT_REPORT,
    apply: false,
    hideMissing: false,
    restoreMissing: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--hide-missing") args.hideMissing = true;
    else if (arg === "--keep-missing") args.hideMissing = false;
    else if (arg === "--restore-missing") args.restoreMissing = true;
    else if (arg === "--url") args.url = argv[++i] || DEFAULT_FEED_URL;
    else if (arg === "--feed") args.feed = argv[++i] || DEFAULT_FEED_FILE;
    else if (arg === "--snapshot") args.snapshot = argv[++i] || DEFAULT_SNAPSHOT;
    else if (arg === "--report") args.report = argv[++i] || DEFAULT_REPORT;
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

function attrs(source) {
  const result = {};
  for (const match of source.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
    result[match[1]] = decodeXml(match[2]);
  }
  return result;
}

function textOf(source, tag) {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function parseYml(xml) {
  const feedDate = attrs(xml.match(/<yml_catalog\b([^>]*)>/i)?.[1] || "").date || "";
  const categories = new Map();
  for (const match of xml.matchAll(/<category\b([^>]*)>([\s\S]*?)<\/category>/gi)) {
    const categoryAttrs = attrs(match[1]);
    if (categoryAttrs.id) categories.set(categoryAttrs.id, decodeXml(match[2]));
  }

  const offers = new Map();
  for (const match of xml.matchAll(/<offer\b([^>]*)>([\s\S]*?)<\/offer>/gi)) {
    const offerAttrs = attrs(match[1]);
    const body = match[2];
    const params = {};
    for (const param of body.matchAll(/<param\b([^>]*)>([\s\S]*?)<\/param>/gi)) {
      const paramAttrs = attrs(param[1]);
      if (paramAttrs.name) params[paramAttrs.name] = decodeXml(param[2]);
    }
    const id = offerAttrs.id || "";
    const categoryId = textOf(body, "categoryId");
    const price = Number(textOf(body, "price"));
    if (!id || !Number.isFinite(price) || price <= 0) continue;
    offers.set(id, {
      id,
      available: offerAttrs.available !== "false",
      groupId: offerAttrs.group_id || "",
      name: textOf(body, "name"),
      price,
      categoryId,
      category: categories.get(categoryId) || "",
      url: textOf(body, "url"),
      vendorCode: textOf(body, "vendorCode"),
      grade: params["Выберете сорт"] || params["Выберите сорт"] || params["Сорт"] || "",
      selectedLength: params["Выберете длину"] || params["Выберите длину"] || params["Длина"] || "",
      size: params["Типоразмер (мм)"] || params["Размер"] || "",
      params,
    });
  }
  return { feedDate, offers };
}

function piloPriceFromPilmos(sourcePrice) {
  const price = Math.round(Number(sourcePrice));
  if (!Number.isFinite(price) || price <= 0) return null;
  return Math.max(1, price - PRICE_DELTA_RUB);
}

function roundPrice(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.round(value));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[×х]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGradeToken(value) {
  const token = String(value || "")
    .replace(/^сорт\s+/i, "")
    .trim()
    .replace(/\s*[-–]\s*/g, "-");
  if (!token || token.includes(",")) return "";
  if (/экстра/i.test(token)) return "Экстра";
  if (/прима/i.test(token)) return "Прима";
  if (/калевала/i.test(token)) return "Калевала";
  if (/кроношпан/i.test(token)) return "";
  const mapped = token
    .replace(/[Аа]/g, "A")
    .replace(/[Вв]/g, "B")
    .replace(/[Сс]/g, "C")
    .replace(/[Ёё]/g, "E")
    .toUpperCase();
  if (mapped === "ЭКСТРА") return "Экстра";
  if (mapped === "ПРИМА") return "Прима";
  if (/^(?:[ABC]|AB|BC|AC|[ABC0-9]+-[ABC0-9]+|\d+\/\d+|\d+)$/.test(mapped)) return mapped;
  return "";
}

function normalizeGradeLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const reverse = raw.match(/^(.+?)\s+сорт$/i);
  if (reverse) {
    const token = normalizeGradeToken(reverse[1]);
    return token ? `сорт ${token}` : "";
  }
  const cleaned = raw.replace(/^сорт\s+/i, "").trim();
  const token = normalizeGradeToken(cleaned);
  return token ? `сорт ${token}` : "";
}

function hasGradeLabel(size) {
  const text = normalizeText(size);
  return /\bсорт\b|экстра|прима/.test(text);
}

function isGradePart(value) {
  const raw = String(value || "").trim();
  const text = normalizeText(raw);
  return (
    Boolean(normalizeGradeLabel(raw)) ||
    /^сорт\s+/.test(text) ||
    /^.+\s+сорт$/.test(text) ||
    /^(?:экстра|прима|прима\s*\([аa]\)|калевала|кроношпан|д|a|b|c|ab|bc|ac|ав|вс|ас|\d+|\d+\/\d+|\d+-\d+)$/.test(text)
  );
}

function removeGradeParts(size) {
  const parts = String(size || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !isGradePart(part));
  return parts.join(", ").trim();
}

function dedupeGradeParts(size) {
  const parts = String(size || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const baseParts = parts.filter((part) => !isGradePart(part));
  const explicitGrade = [...parts].reverse().find((part) => /^сорт\s+/i.test(part) && normalizeGradeLabel(part));
  const anyGrade = [...parts].reverse().find((part) => normalizeGradeLabel(part));
  const gradePart = explicitGrade || anyGrade;
  const gradeLabel = normalizeGradeLabel(gradePart);
  return [...baseParts, gradeLabel].filter(Boolean).join(", ");
}

function appendFeedGrade(size, feedGrade) {
  const grade = normalizeGradeLabel(feedGrade);
  if (!grade) return size;
  const base = hasGradeLabel(size) ? removeGradeParts(size) : String(size || "").trim();
  return base ? `${base}, ${grade}` : grade;
}

function lengthToMillimeters(value) {
  const text = String(value || "").replace(",", ".").trim();
  if (!text || /[-–]/.test(text)) return null;
  const numeric = Number(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (numeric < 20) return Math.round(numeric * 1000);
  if (numeric < 1000) return Math.round(numeric * 1000);
  return Math.round(numeric);
}

function applySelectedLength(size, offer) {
  const lengthMm = lengthToMillimeters(offer.selectedLength);
  if (!lengthMm) return size;
  const parts = String(size || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const main = parts.shift() || "";
  const dimensionMatch = main.match(/^(\d+)\s*[×xх]\s*(\d+)(?:\s*[×xх]\s*\d+)?\s*мм/i);
  if (!dimensionMatch) return size;
  const nextMain = `${dimensionMatch[1]}×${dimensionMatch[2]}×${lengthMm} мм`;
  return [nextMain, ...parts].join(", ");
}

function inferOfferUnit(offer, variant) {
  const url = decodeURIComponent(String(offer.url || "").toLowerCase());
  const haystack = normalizeText(`${offer.name} ${offer.category} ${offer.size} ${offer.grade} ${url}`);
  if (/attribute_pa_ed-izm=m³|attribute_pa_ed-izm=m3|attribute_pa_ed-izm=%d0%bc/.test(url)) return "CUBE";
  if (/attribute_pa_ed-izm=sht|attribute_pa_ed-izm=шт/.test(url)) return "PIECE";
  if (/1-m²|1-m2|1-м2|1-м²|за 1 м2|за 1 м²/.test(haystack)) return "SQUARE";
  if (variant.pricePerSquareMeter) return "SQUARE";
  if (variant.pricePerCube && !variant.pricePerPiece) return "CUBE";
  if (variant.pricePerPiece && !variant.pricePerCube) return "PIECE";
  if (variant.pricePerCube && Number(offer.price) >= 6000) return "CUBE";
  if (variant.pricePerPiece) return "PIECE";
  return "";
}

function priceFields(variant) {
  return {
    pricePerCube: variant.pricePerCube ?? null,
    pricePerSquareMeter: variant.pricePerSquareMeter ?? null,
    pricePerPiece: variant.pricePerPiece ?? null,
    piecesPerCube: variant.piecesPerCube ?? null,
    unit: variant.unit,
  };
}

function samePriceFields(a, b) {
  return (
    a.pricePerCube === b.pricePerCube &&
    a.pricePerSquareMeter === b.pricePerSquareMeter &&
    a.pricePerPiece === b.pricePerPiece &&
    a.piecesPerCube === b.piecesPerCube &&
    a.unit === b.unit
  );
}

function hasAnyPrice(variant) {
  return [variant.pricePerCube, variant.pricePerSquareMeter, variant.pricePerPiece, variant.price].some((price) => {
    const numeric = Number(price);
    return Number.isFinite(numeric) && numeric > 0;
  });
}

function updateVariantFromOffer(variant, offer) {
  const before = priceFields(variant);
  const unit = inferOfferUnit(offer, variant);
  const nextPrice = piloPriceFromPilmos(offer.price);
  const warnings = [];
  if (!unit) warnings.push("unit-not-detected");
  if (!nextPrice) warnings.push("bad-price");
  if (!nextPrice) return { changed: false, unit, before, after: priceFields(variant), warnings };

  variant.sourcePrice = offer.price;
  variant.price = nextPrice;
  variant.inStock = offer.available;
  const beforeSize = variant.size;
  variant.size = appendFeedGrade(applySelectedLength(variant.size, offer), offer.grade);

  if (unit === "SQUARE") {
    variant.unit = "SQUARE";
    variant.pricePerSquareMeter = nextPrice;
    variant.pricePerCube = null;
    variant.pricePerPiece = null;
    variant.piecesPerCube = null;
  } else if (unit === "CUBE") {
    variant.pricePerCube = nextPrice;
    if (variant.pricePerPiece && variant.piecesPerCube) {
      variant.pricePerPiece = roundPrice(nextPrice / Number(variant.piecesPerCube));
      variant.unit = "BOTH";
    } else {
      variant.pricePerPiece = null;
      variant.unit = "CUBE";
    }
    variant.pricePerSquareMeter = null;
  } else if (unit === "PIECE") {
    variant.pricePerPiece = nextPrice;
    variant.pricePerCube = null;
    variant.unit = "PIECE";
    variant.pricePerSquareMeter = null;
  }

  const after = priceFields(variant);
  return {
    changed: !samePriceFields(before, after) || beforeSize !== variant.size,
    unit,
    before,
    after,
    beforeSize,
    afterSize: variant.size,
    warnings,
  };
}

function escapeMd(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function main() {
  const args = parseArgs(process.argv);
  const feedSource = args.url || args.feed;
  const xml = args.url
    ? await download(args.url)
    : fs.readFileSync(path.resolve(args.feed), "utf8");
  const feed = parseYml(xml);
  const snapshotPath = path.resolve(args.snapshot);
  const snapshot = readJson(snapshotPath);

  const reportRows = [];
  const missingRows = [];
  const warnings = [];
  const categorySummary = new Map();
  let matched = 0;
  let changed = 0;
  let gradeUpdated = 0;
  let stockChanged = 0;
  let missingHidden = 0;
  let missingRestored = 0;
  let exactDuplicatesHidden = 0;

  for (const product of snapshot.products || []) {
    for (const variant of product.variants || []) {
      const offer = feed.offers.get(String(variant.externalId || ""));
      if (!offer) {
        if (args.hideMissing && variant.inStock !== false) {
          missingHidden += 1;
        }
        if (args.restoreMissing && variant.inStock === false && hasAnyPrice(variant)) {
          missingRestored += 1;
        }
        if (args.apply && args.hideMissing) {
          variant.inStock = false;
          variant.stockQty = 0;
        }
        if (args.apply && args.restoreMissing && hasAnyPrice(variant)) {
          variant.inStock = true;
          if (variant.stockQty === 0) variant.stockQty = null;
        }
        missingRows.push({
          product: product.name,
          slug: product.slug,
          size: variant.size,
          externalId: variant.externalId,
          action: args.restoreMissing
            ? "restore-legacy-priced-variant"
            : args.hideMissing
              ? "hide-from-public-catalog"
              : "keep",
        });
        continue;
      }

      matched += 1;
      const oldStock = variant.inStock;
      const result = updateVariantFromOffer(variant, offer);
      if (result.changed) changed += 1;
      if (result.beforeSize !== result.afterSize) gradeUpdated += 1;
      if (oldStock !== variant.inStock) stockChanged += 1;
      if (result.warnings.length) {
        warnings.push({
          product: product.name,
          size: result.afterSize || variant.size,
          feedId: offer.id,
          warnings: result.warnings,
          feedName: offer.name,
        });
      }

      const summary = categorySummary.get(product.categorySlug) || {
        categorySlug: product.categorySlug,
        matched: 0,
        changed: 0,
      };
      summary.matched += 1;
      if (result.changed) summary.changed += 1;
      categorySummary.set(product.categorySlug, summary);

      reportRows.push({
        product: product.name,
        slug: product.slug,
        categorySlug: product.categorySlug,
        feedId: offer.id,
        feedName: offer.name,
        feedPrice: offer.price,
        feedUnit: result.unit,
        feedGrade: offer.grade,
        sizeBefore: result.beforeSize,
        sizeAfter: result.afterSize,
        before: result.before,
        after: result.after,
        changed: result.changed,
        url: offer.url,
      });
    }
  }

  let normalizedGradeLabels = 0;
  for (const product of snapshot.products || []) {
    for (const variant of product.variants || []) {
      const normalizedSize = dedupeGradeParts(variant.size);
      if (normalizedSize && normalizedSize !== variant.size) {
        variant.size = normalizedSize;
        normalizedGradeLabels += 1;
      }
    }
  }

  for (const product of snapshot.products || []) {
    const seen = new Map();
    const variants = [...(product.variants || [])].sort((a, b) => {
      const score = (variant) =>
        (variant.inStock === false ? 1000 : 0) +
        (variant.piecesPerCube ? 0 : 10) +
        (variant.stockQty ? 0 : 1) +
        Number(variant.sortOrder || 0) / 1000;
      return score(a) - score(b);
    });
    for (const variant of variants) {
      if (variant.inStock === false || !hasAnyPrice(variant)) continue;
      const key = [
        variant.size,
        variant.unit || "",
        variant.pricePerCube || "",
        variant.pricePerSquareMeter || "",
        variant.pricePerPiece || "",
      ].join("|");
      if (!seen.has(key)) {
        seen.set(key, variant);
        continue;
      }
      variant.inStock = false;
      variant.stockQty = 0;
      exactDuplicatesHidden += 1;
    }
  }

  const finalSizeByExternalId = new Map();
  for (const product of snapshot.products || []) {
    for (const variant of product.variants || []) {
      if (variant.externalId) finalSizeByExternalId.set(String(variant.externalId), variant.size);
    }
  }
  for (const row of reportRows) {
    row.sizeAfter = finalSizeByExternalId.get(String(row.feedId)) || row.sizeAfter;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    applied: args.apply,
    feedSource,
    feedDate: feed.feedDate,
    feedOffers: feed.offers.size,
    pricePolicy: `PiloRus price = Pilmos feed price - ${PRICE_DELTA_RUB} RUB by exact offer ID`,
    snapshotPath: args.snapshot,
    products: snapshot.products?.length || 0,
    variants: reportRows.length + missingRows.length,
    matched,
    changed,
    unchanged: matched - changed,
    gradeUpdated,
    normalizedGradeLabels,
    stockChanged,
    missingHidden,
    missingRestored,
    exactDuplicatesHidden,
    missingInFeed: missingRows.length,
    categorySummary: [...categorySummary.values()],
    warnings,
    missingRows: missingRows.slice(0, 200),
    changedRows: reportRows.filter((row) => row.changed),
  };

  snapshot.generatedAt = report.generatedAt;
  snapshot.source = "Pilmos live YML feed";
  snapshot.sourceCsv = feedSource;
  snapshot.sourcePricePolicy = report.pricePolicy;
  snapshot.priceFactor = 1;
  snapshot.priceDeltaRub = PRICE_DELTA_RUB;
  snapshot.feedDate = feed.feedDate;

  fs.mkdirSync(path.dirname(path.resolve(args.report)), { recursive: true });
  fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const mdPath = path.resolve(args.report).replace(/\.json$/i, ".md");
  const md = [
    "# Pilmos feed price sync",
    "",
    `- Applied: ${args.apply ? "yes" : "no"}`,
    `- Feed: ${feedSource}`,
    `- Feed date: ${feed.feedDate || "unknown"}`,
    `- Policy: ${report.pricePolicy}`,
    `- Matched variants: ${matched}`,
    `- Changed variants: ${changed}`,
    `- Grade labels added: ${gradeUpdated}`,
    `- Grade labels normalized: ${normalizedGradeLabels}`,
    `- Stock changes: ${stockChanged}`,
    `- Missing in feed: ${missingRows.length}`,
    `- Missing variants hidden from public catalog: ${missingHidden}`,
    `- Missing priced variants restored: ${missingRestored}`,
    `- Exact duplicate variants hidden: ${exactDuplicatesHidden}`,
    "",
    "## Categories",
    ...report.categorySummary.map((item) => `- ${item.categorySlug}: ${item.changed}/${item.matched} changed`),
    "",
    "## Changed samples",
    "| Product | Size | Unit | Pilmos | Before | After |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...report.changedRows.slice(0, 40).map((row) => {
      const before = [row.before.pricePerCube, row.before.pricePerSquareMeter, row.before.pricePerPiece].filter(Boolean).join(" / ");
      const after = [row.after.pricePerCube, row.after.pricePerSquareMeter, row.after.pricePerPiece].filter(Boolean).join(" / ");
      return `| ${escapeMd(row.product)} | ${escapeMd(row.sizeAfter || row.sizeBefore)} | ${row.feedUnit} | ${row.feedPrice} | ${before} | ${after} |`;
    }),
    "",
  ];
  fs.writeFileSync(mdPath, `${md.join("\n")}\n`, "utf8");

  if (args.apply) {
    fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({
    applied: args.apply,
    feedDate: report.feedDate,
    matched,
    changed,
    gradeUpdated,
    normalizedGradeLabels,
    stockChanged,
    missingHidden,
    missingRestored,
    exactDuplicatesHidden,
    missingInFeed: missingRows.length,
    report: args.report,
    markdown: path.relative(process.cwd(), mdPath),
  }, null, 2));
}

main().catch((error) => {
  console.error(`[sync-pilmos-feed-snapshot-prices] ${error.message}`);
  process.exitCode = 1;
});
