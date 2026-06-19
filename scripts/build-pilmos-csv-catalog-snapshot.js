#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_CSV = "C:/Users/StormPC/Downloads/wc-product-export-11-6-2026-1781182114661.csv";
const DEFAULT_OUT = "prisma/catalog/pilmos-catalog-2026-06-14.json";
const DEFAULT_REPORT = "tmp/pilmos-catalog-snapshot-report.json";
const PRICE_FACTOR = 0.99;

const C = {
  ID: 0,
  TYPE: 1,
  SKU: 2,
  NAME: 4,
  PUBLISHED: 5,
  SHORT_DESCRIPTION: 8,
  DESCRIPTION: 9,
  IN_STOCK: 14,
  STOCK_QTY: 15,
  SALE_PRICE: 25,
  REGULAR_PRICE: 26,
  CATEGORIES: 27,
  TAGS: 28,
  IMAGES: 30,
  PARENT: 33,
  ATTR1_NAME: 41,
  ATTR1_VALUE: 42,
  ATTR2_NAME: 45,
  ATTR2_VALUE: 46,
  ATTR3_NAME: 49,
  ATTR3_VALUE: 50,
  ATTR4_NAME: 53,
  ATTR4_VALUE: 54,
  YOAST_TITLE: 81,
  YOAST_DESCRIPTION: 82,
  RANK_TITLE: 123,
  RANK_DESCRIPTION: 124,
  RANK_KEYWORD: 125,
  VARIATION_TITLE: 230,
};

const CATEGORY_DEFS = {
  "sosna-el": {
    name: "Сосна и Ель",
    sortOrder: 1,
    image: "/images/products/doska-obreznaya-1sort-sosna.webp",
    seoTitle: "Сосна и ель — пиломатериалы с доставкой",
    seoDescription: "Пиломатериалы из сосны и ели: доска, брус, брусок, строганые и сухие позиции для строительства и отделки.",
  },
  listvennitsa: {
    name: "Лиственница",
    sortOrder: 2,
    image: "/images/products/doska-obreznaya-1sort-listv.webp",
    seoTitle: "Лиственница — доска, брус и отделочные материалы",
    seoDescription: "Лиственница для фасада, террасы, строительства и отделки. Актуальные размеры, цены и доставка по Москве и Московской области.",
  },
  fanera: {
    name: "Фанера",
    sortOrder: 4,
    image: "/images/products/fanera-fsf-bereza-1220.webp",
    seoTitle: "Фанера — цены и наличие",
    seoDescription: "Фанера ФК, ФСФ и ламинированная фанера для строительства, ремонта и производства.",
  },
  "dsp-mdf-osb": {
    name: "ДСП, ДВП, МДФ, ЦСП, OSB",
    sortOrder: 4.5,
    image: "/images/products/osb-3-1220.webp",
    seoTitle: "ДСП, ДВП, МДФ, ЦСП и OSB — листовые материалы",
    seoDescription: "ДСП, ДВП, МДФ, ЦСП и OSB в листах: толщины, форматы, цены за штуку и доставка по Москве и Московской области.",
  },
  kedr: {
    name: "Кедр",
    sortOrder: 5,
    image: "/images/products/planken-kedr.webp",
    seoTitle: "Кедр — пиломатериалы и отделка",
    seoDescription: "Кедровые пиломатериалы и отделочные позиции для бань, фасадов и интерьерных работ.",
  },
  "lipa-osina": {
    name: "Липа и Осина",
    sortOrder: 6,
    image: "/images/products/vagonka-lipa.webp",
    seoTitle: "Липа и осина — материалы для бани и отделки",
    seoDescription: "Вагонка, полки, плинтусы и другие позиции из липы и осины для бань, саун и чистовой отделки.",
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    csv: DEFAULT_CSV,
    out: DEFAULT_OUT,
    report: DEFAULT_REPORT,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--csv") parsed.csv = args[++i];
    if (arg === "--out") parsed.out = args[++i];
    if (arg === "--report") parsed.report = args[++i];
  }

  return parsed;
}

function clean(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return clean(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsv(text) {
  const firstLine = text.slice(0, text.indexOf("\n") > -1 ? text.indexOf("\n") : 1000);
  const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => clean(cell) !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((cell) => clean(cell) !== "")) rows.push(row);
  return rows;
}

function parseNumber(value) {
  const raw = clean(value).replace(/\s/g, "").replace(",", ".");
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function isPublished(row) {
  const value = clean(row[C.PUBLISHED]).toLowerCase();
  return value !== "0" && value !== "false" && value !== "нет";
}

function isInStock(row) {
  const value = clean(row[C.IN_STOCK]).toLowerCase();
  return value === "" || value === "1" || value === "yes" || value === "instock" || value === "да";
}

function getPrice(row) {
  return parseNumber(row[C.SALE_PRICE]) ?? parseNumber(row[C.REGULAR_PRICE]);
}

function priceForPiloRus(sourcePrice) {
  const discounted = sourcePrice * PRICE_FACTOR;
  if (discounted >= 1000) return Math.max(1, Math.round(discounted / 10) * 10);
  return Math.max(1, Math.round(discounted));
}

function splitImages(value) {
  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

const translitMap = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function slugify(value) {
  const base = clean(value)
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => translitMap[char] ?? char)
    .replace(/&/g, " i ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 86)
    .replace(/-+$/g, "");
  return base || "product";
}

function cleanProductName(value) {
  return clean(value)
    .replace(/(^|\s)([2-6])\s*-\s*([2-6])\s*мм(?=\s|$)/gi, "$1$2-$3 м")
    .replace(/(\d)\s*мм(?=\s|$)/gi, "$1 мм")
    .replace(/(\d)\s*м(?=\s|$)/gi, "$1 м")
    .replace(/\s+-\s+АКЦИЯ!?/gi, "")
    .replace(/\s+АКЦИЯ!?/gi, "")
    .replace(/\s+-\s+РАСПРОДАЖА!?/gi, "")
    .replace(/\s+РАСПРОДАЖА!?/gi, "")
    .replace(/\s+купить.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSize(value) {
  return clean(value)
    .replace(/(\d)\s*[xх×*]\s*(\d)/gi, "$1×$2")
    .replace(/\s*\/\s*/g, "/")
    .replace(/(\d)\s*мм(?=\s|$)/gi, "$1 мм")
    .replace(/(\d)\s*м(?=\s|$)/gi, "$1 м")
    .replace(/\s+мм\b/gi, " мм")
    .replace(/\s+м\b/gi, " м")
    .trim();
}

function extractSize(text) {
  const value = clean(text);
  const patterns = [
    /(\d{1,4}\s*[xх×*]\s*\d{1,4}\s*[xх×*]\s*\d{3,5}(?:\s*мм)?)/i,
    /(\d{1,4}\s*[xх×*]\s*\d{1,4}(?:\s*\/\s*\d{1,4})?\s*мм(?:\s*\d(?:[,.]\d)?(?:\s*[-–]\s*\d(?:[,.]\d)?)?\s*м)?)/i,
    /(\d{1,4}\s*[xх×*]\s*\d{1,4}(?:\s*\/\s*\d{1,4})?)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return normalizeSize(match[1]);
  }

  return "";
}

function withDefaultTimberLength(size) {
  const value = normalizeSize(size);
  const sixMeterRange = value.match(/^(\d{1,4}×\d{1,4})\s*мм\s*2\s*[-–]\s*6\s*м((?:\s*,.*)?)$/i);
  if (sixMeterRange) {
    return `${sixMeterRange[1]}×6000 мм${sixMeterRange[2] || ""}`;
  }
  const meterLength = value.match(/^(\d{1,4}×\d{1,4})\s*мм\s+(\d)(?:[,.](\d))?\s*м((?:\s*,.*)?)$/i);
  if (meterLength) {
    const meters = Number(`${meterLength[2]}.${meterLength[3] || "0"}`);
    if (Number.isFinite(meters) && meters > 0) {
      return `${meterLength[1]}×${Math.round(meters * 1000)} мм${meterLength[4] || ""}`;
    }
  }
  const match = value.match(/^(\d{1,4}×\d{1,4}(?:\/\d{1,4})?)\s*мм((?:\s*,.*)?)$/i);
  if (match) {
    return `${match[1]}×6000 мм${match[2] || ""}`;
  }
  return value;
}

function normalizeKeyText(value) {
  return normalizeSize(value)
    .toLowerCase()
    .replace(/[х×]/g, "x")
    .replace(/[()]/g, " ")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function compactProductText(value) {
  return clean(value)
    .replace(/(\d)\s*[xх×*]\s*(\d)/gi, "$1×$2")
    .replace(/\s*×\s*/g, "×")
    .replace(/(\d)\s*мм\b/gi, "$1 мм")
    .replace(/(\d)\s*м\b/gi, "$1 м")
    .replace(/\s+/g, " ")
    .trim();
}

function isExcludedImportProduct(product) {
  const text = normalizeKeyText(`${product.name} ${product.sourceCategoryText}`);
  return /опилк|щепа|дрова|топлив|мешк/.test(text);
}

function extractSheetSize(text) {
  const value = normalizeSize(text);
  const match = value.match(/(\d{3,4})\s*×\s*(\d{3,4})(?:\s*мм)?/);
  return match ? `${match[1]}×${match[2]} мм` : "";
}

function extractThickness(text) {
  const value = normalizeSize(text);
  const triple = value.match(/(\d{1,3}(?:[,.]\d+)?)\s*×\s*(\d{3,4})\s*×\s*(\d{3,4})/);
  if (triple) return `${triple[1].replace(",", ".")} мм`;
  const leading = value.match(/(?:^|\s)(\d{1,2}(?:[,.]\d+)?)\s*мм\s+\d{3,4}\s*×\s*\d{3,4}/i);
  if (leading) return `${leading[1].replace(",", ".")} мм`;
  const afterSheet = value.match(/\d{3,4}\s*×\s*\d{3,4}\s*мм\s*(?:сорт\s*)?[^,\s/]*\s*(\d{1,2}(?:[,.]\d+)?)\s*мм/i);
  if (afterSheet) return `${afterSheet[1].replace(",", ".")} мм`;
  const simple = value.match(/(?:^|\s)(\d{1,2}(?:[,.]\d+)?)\s*мм(?:\s|$)/i);
  if (!simple) return "";
  const thickness = Number(simple[1].replace(",", "."));
  return thickness > 0 && thickness < 80 ? `${simple[1].replace(",", ".")} мм` : "";
}

function extractGrade(text) {
  const value = clean(text).replace(/\\/g, "");
  const normalized = value.replace(/\s+/g, " ");
  const direct = normalized.match(/(?:сорт|класс)\s*(Экстра|Прима|AB|АВ|BC|ВС|A|А|B|В|C|С|\d(?:\s*[-/]\s*\d)?|2\s*-\s*3)/i);
  if (direct) return `сорт ${direct[1].replace(/\s+/g, "").replace("АВ", "AB").replace("ВС", "BC")}`;
  const fraction = normalized.match(/\b([1-4]\s*\/\s*[1-4])\b/);
  if (fraction) return `сорт ${fraction[1].replace(/\s+/g, "")}`;
  const shortGrade = normalized.match(/\b(AB|BC|A|B|C|АВ|ВС|А|В|С)\b/i);
  if (shortGrade) return `сорт ${shortGrade[1].replace("АВ", "AB").replace("ВС", "BC")}`;
  return "";
}

function extractForest(text) {
  const value = clean(text);
  const match = value.match(/(Архангельский|Вологодский|Кировский)\s+лес/i);
  return match ? `${match[1]} лес` : "";
}

function titleCaseFirst(value) {
  const text = clean(value);
  if (!text) return text;
  return `${text.charAt(0).toLocaleUpperCase("ru-RU")}${text.slice(1)}`;
}

function stripVariantNoise(value) {
  return clean(value)
    .replace(/Акции на пиломатериалы[^/|,]*/gi, "")
    .replace(/Цена за\s*(?:м3|м³|шт\.?|штуку)/gi, "")
    .replace(/\b(?:м3|м³|шт\.?|штука|за штуку)\b/gi, "")
    .replace(/\\,/g, ",")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .replace(/(?:^|\/)\s*$/g, "")
    .trim();
}

function cleanVariantLabel(parts) {
  const seen = new Set();
  const cleanParts = [];
  for (const part of parts.map(stripVariantNoise).filter(Boolean)) {
    const key = normalizeKeyText(part).replace(/[.,]/g, "");
    if (!key || seen.has(key)) continue;
    const hasCoveredSize = [...seen].some((item) => item.includes(key) || key.includes(item));
    if (hasCoveredSize && /\d/.test(key)) continue;
    seen.add(key);
    cleanParts.push(compactProductText(part));
  }
  return cleanParts.join(", ") || "Стандарт";
}

function prettifyVariantLabel(value) {
  return clean(value)
    .replace(/\b(\d{1,4})[\u00d7x](\d{1,4})[\u00d7x](\d{3,5})(?!\s*(?:\u043c\u043c|mm))\b/gi, "$1\u00d7$2\u00d7$3 \u043c\u043c")
    .replace(/\b(\d{1,4})[\u00d7x](\d{1,4})(?!\s*(?:[\u00d7x]|\u043c\u043c|mm|\u043c\b))\b/gi, "$1\u00d7$2 \u043c\u043c")
    .replace(/\s*\/\s*\u0410\u043a\u0446\u0438\u0438?\s+\u043d\u0430\s+\u043f\u0438\u043b\u043e\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b[^,]*/gi, "")
    .replace(/(\u0441\u043e\u0440\u0442\s+)[\u0441c](?=\b|,|$)/gi, "$1C")
    .replace(/(\d)\s*\/\s*(\d)/g, "$1/$2")
    .replace(/Ар×ангельский/gi, "Архангельский")
    .replace(/\bсорт\s+([abcавс])\b/gi, (_m, grade) => `сорт ${String(grade).toUpperCase().replace("А", "A").replace("В", "B").replace("С", "C")}`)
    .replace(/\bсорт\s+c\b/gi, "сорт C")
    .replace(/\b0\s*мм,\s*/gi, "")
    .replace(/\b0\s*мм\b/gi, "")
    .replace(/^\s*,\s*/g, "")
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim() || "Стандарт";
}

function isValidSheetThickness(value) {
  const text = clean(value);
  const match = text.match(/^(\d{1,2}(?:[,.]\d+)?)\s*(?:мм|mm)$/i);
  if (!match) return false;
  const thickness = Number(match[1].replace(",", "."));
  return Number.isFinite(thickness) && thickness > 0 && thickness < 80;
}

function sheetFamilyName(productName, categoryText) {
  const text = `${productName} ${categoryText}`;
  const normalized = normalizeKeyText(text);
  const sheetSize = extractSheetSize(text);
  if (/\bosb\b|осб/.test(normalized)) {
    const type = /osb-?3|осб-?3/.test(normalized) ? "Плита OSB-3" : "Плита OSB";
    const used = /б\/у|бу/.test(normalized) ? " Б/У" : "";
    return `${type}${used}${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  }
  if (/мдф/.test(normalized)) return `МДФ${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  if (/дсп/.test(normalized)) return `ДСП${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  if (/двп|оргалит/.test(normalized)) return `ДВП (оргалит)${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  if (/цсп/.test(normalized)) return `Плита ЦСП${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  if (/ламинир/.test(normalized)) return `Фанера ламинированная${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  if (/фк/.test(normalized)) return `Фанера ФК${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  if (/фсф/.test(normalized)) {
    const wood = /берез/.test(normalized) ? " березовая" : /хво/.test(normalized) ? " хвойная" : "";
    return `Фанера ФСФ${wood}${sheetSize ? ` ${sheetSize}` : ""}`.trim();
  }
  return `Фанера${sheetSize ? ` ${sheetSize}` : ""}`.trim();
}

function woodSpecies(productName, categorySlug, categoryText) {
  const text = normalizeKeyText(`${productName} ${categoryText}`);
  if (/листвен/.test(text)) return "из лиственницы";
  if (/кедр/.test(text)) return "из кедра";
  if (/осин/.test(text)) return "из осины";
  if (/лип/.test(text)) return "из липы";
  if (/сосн|ел|ель/.test(text) || categorySlug === "sosna-el") return "из сосны и ели";
  return "";
}

function woodFamily(productName, categoryText) {
  const text = normalizeKeyText(`${productName} ${categoryText}`);
  if (/блок[\s-]?хаус/.test(text)) return "Блок-хаус";
  if (/имитац/.test(text)) return "Имитация бруса";
  if (/евровагонк/.test(text)) return "Евровагонка";
  if (/вагонк/.test(text)) return "Вагонка";
  if (/планкен/.test(text)) return "Планкен";
  if (/террас/.test(text)) return "Террасная доска";
  if (/доска пола|полов/.test(text)) return "Доска пола";
  if (/брусок/.test(text)) return /строган/.test(text) ? "Брусок строганный" : "Брусок";
  if (/брус/.test(text)) {
    if (/клеен/.test(text)) return "Брус клееный";
    if (/строган/.test(text)) return "Брус строганный";
    return "Брус обрезной";
  }
  if (/доск/.test(text)) {
    if (/строган/.test(text)) return "Доска строганная";
    return "Доска обрезная";
  }
  return productKind(productName, categoryText);
}

function woodStandard(productName, categoryText) {
  const text = normalizeKeyText(`${productName} ${categoryText}`);
  if (/гост/.test(text)) return "(ГОСТ)";
  if (/\bту\b/.test(text)) return "(ТУ)";
  if (/сух/.test(text)) return "сухая";
  if (/антисепт/.test(text)) return "антисептированная";
  return "";
}

function isSheetCategorySlug(slug) {
  return slug === "fanera" || slug === "dsp-mdf-osb";
}

function buildStorefrontGroup(product) {
  if (isExcludedImportProduct(product)) return null;

  if (isSheetCategorySlug(product.categorySlug)) {
    const name = sheetFamilyName(product.name, product.sourceCategoryText);
    return {
      key: `${product.categorySlug}|${normalizeKeyText(name)}`,
      name,
      slugBase: slugify(name),
    };
  }

  const family = woodFamily(product.name, product.sourceCategoryText);
  const species = woodSpecies(product.name, product.categorySlug, product.sourceCategoryText);
  const standard = woodStandard(product.name, product.sourceCategoryText);
  const name = titleCaseFirst([family, species, standard].filter(Boolean).join(" "));
  return {
    key: `${product.categorySlug}|${normalizeKeyText(name)}`,
    name,
    slugBase: slugify(name),
  };
}

function buildDisplayVariant(product, variant) {
  const text = `${product.name} ${variant.size}`;
  const sourcePrice = variant.sourcePrice;
  const price = variant.price;
  const unit = variant.unit;

  if (isSheetCategorySlug(product.categorySlug)) {
    const thickness = extractThickness(text);
    if (!isValidSheetThickness(thickness)) return null;
    const grade = extractGrade(text);
    const size = prettifyVariantLabel(cleanVariantLabel([thickness, grade]));
    return {
      ...variant,
      size,
      sourcePrice,
      price,
      unit,
      pricePerCube: unit === "CUBE" ? price : null,
      pricePerPiece: unit === "PIECE" ? price : null,
      piecesPerCube: null,
    };
  }

  const size = withDefaultTimberLength(extractSize(text));
  if (!size) return null;
  const grade = extractGrade(text);
  const forest = extractForest(text);
  const displaySize = withDefaultTimberLength(prettifyVariantLabel(cleanVariantLabel([size, grade, forest])));
  const forcedPiecesPerCube = shouldForceHighTimberCube(product, variant, displaySize);
  const displayUnit = forcedPiecesPerCube ? "CUBE" : unit;
  return {
    ...variant,
    size: displaySize,
    sourcePrice,
    price,
    unit: displayUnit,
    pricePerCube: displayUnit === "CUBE" ? price : null,
    pricePerPiece: displayUnit === "PIECE" ? price : null,
    piecesPerCube: displayUnit === "CUBE" ? forcedPiecesPerCube || robustPiecesPerCube(size) || piecesPerCube(size) : null,
  };
}

function robustPiecesPerCube(size) {
  const numbers = clean(size).match(/\d+/g)?.map(Number) || [];
  if (numbers.length < 3 || numbers[2] < 1000) return null;
  const volume = (numbers[0] / 1000) * (numbers[1] / 1000) * (numbers[2] / 1000);
  if (!Number.isFinite(volume) || volume <= 0) return null;
  return Math.max(1, Math.floor(1 / volume));
}

function sizeHasCubeUnitHint(value) {
  return /(?:^|[\s/])(?:m3|m\^3|m\u00b3|\u043c3|\u043c\^3|\u043c\u00b3)(?:$|[\s/.,;])/i.test(clean(value));
}

function shouldForceHighTimberCube(product, variant, displaySize) {
  if (product.categorySlug === "fanera" || product.categorySlug === "dsp-mdf-osb") return null;
  if (variant.unit !== "PIECE") return null;
  if (!sizeHasCubeUnitHint(displaySize) && Number(variant.price) < 10000) return null;
  return robustPiecesPerCube(displaySize);
}

function hasConflictingPiecePrice(variant) {
  const pricePerCube = Number(variant.pricePerCube || 0);
  const pricePerPiece = Number(variant.pricePerPiece || 0);
  const piecesPerCubeValue = Number(variant.piecesPerCube || 0);
  if (!pricePerCube || !pricePerPiece || !piecesPerCubeValue) return false;
  const expectedPiece = pricePerCube / piecesPerCubeValue;
  const diff = Math.abs(pricePerPiece - expectedPiece) / Math.max(1, expectedPiece);
  return diff > 0.25;
}

function normalizeMergedVariantPrice(variant) {
  if (!hasConflictingPiecePrice(variant)) return variant;
  return {
    ...variant,
    price: variant.pricePerCube,
    pricePerPiece: null,
    unit: "CUBE",
  };
}

function mergeVariantPrices(variants) {
  const byKey = new Map();
  for (const variant of variants) {
    const key = normalizeKeyText(variant.size);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...variant });
      continue;
    }

    const next = { ...existing };
    if (variant.pricePerCube && (!next.pricePerCube || variant.pricePerCube < next.pricePerCube)) {
      next.pricePerCube = variant.pricePerCube;
      next.piecesPerCube = variant.piecesPerCube ?? next.piecesPerCube;
    }
    if (variant.pricePerPiece && (!next.pricePerPiece || variant.pricePerPiece < next.pricePerPiece)) {
      next.pricePerPiece = variant.pricePerPiece;
    }
    next.price = Math.min(
      ...[next.pricePerCube, next.pricePerPiece, variant.pricePerCube, variant.pricePerPiece]
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    );
    next.sourcePrice = Math.min(Number(next.sourcePrice || next.price), Number(variant.sourcePrice || variant.price));
    next.unit = next.pricePerCube && next.pricePerPiece ? "BOTH" : next.pricePerCube ? "CUBE" : "PIECE";
    next.inStock = next.inStock || variant.inStock;
    next.stockQty = next.stockQty ?? variant.stockQty ?? null;
    byKey.set(key, next);
  }

  return [...byKey.values()]
    .sort((a, b) => normalizeKeyText(a.size).localeCompare(normalizeKeyText(b.size), "ru", { numeric: true }))
    .map(normalizeMergedVariantPrice)
    .map((variant, index) => ({ ...variant, sortOrder: index }));
}

function groupProductsForStorefront(rawProducts) {
  const groups = new Map();
  for (const product of rawProducts) {
    const group = buildStorefrontGroup(product);
    if (!group) continue;

    const current = groups.get(group.key) || {
      ...group,
      categorySlug: product.categorySlug,
      images: [],
      products: [],
      variants: [],
    };
    current.products.push(product);
    for (const image of product.images) {
      if (image && !current.images.includes(image)) current.images.push(image);
    }
    for (const variant of product.variants) {
      const displayVariant = buildDisplayVariant(product, variant);
      if (displayVariant) current.variants.push(displayVariant);
    }
    groups.set(group.key, current);
  }

  const seenSlugs = new Map();
  return [...groups.values()].map((group) => {
    const category = CATEGORY_DEFS[group.categorySlug];
    const variants = mergeVariantPrices(group.variants).filter(
      (variant) => variant.pricePerCube || variant.pricePerPiece,
    );
    const baseSlug = group.slugBase;
    const seen = seenSlugs.get(baseSlug) || 0;
    seenSlugs.set(baseSlug, seen + 1);
    const slug = seen ? `${baseSlug}-${seen + 1}` : baseSlug;

    return {
      externalId: group.products.map((product) => product.externalId || product.id).filter(Boolean).join(","),
      sourceSku: group.products.map((product) => product.sourceSku || product.sku).filter(Boolean).slice(0, 8).join(","),
      slug,
      name: group.name,
      categorySlug: group.categorySlug,
      images: group.images.slice(0, 1),
      shortDescription: makeShortDescription(group.name, category.name),
      description: makeDescription(group.name, category.name, variants),
      saleUnit: saleUnitFromVariants(variants),
      active: variants.length > 0,
      featured: false,
      variants,
    };
  }).filter((product) => product.active && product.images.length);
}

function productKind(name, categoryText) {
  const text = `${name} ${categoryText}`.toLowerCase();
  if (/фанер/.test(text)) return "фанера";
  if (/(osb|осб)/.test(text)) return "OSB";
  if (/дсп/.test(text)) return "ДСП";
  if (/двп|оргалит/.test(text)) return "ДВП";
  if (/мдф/.test(text)) return "МДФ";
  if (/цсп/.test(text)) return "ЦСП";
  if (/блок[\s-]?хаус/.test(text)) return "блок-хаус";
  if (/имитац/.test(text)) return "имитация бруса";
  if (/планкен/.test(text)) return "планкен";
  if (/вагонк/.test(text)) return "вагонка";
  if (/террас/.test(text)) return "террасная доска";
  if (/полов|доска пола/.test(text)) return "доска пола";
  if (/брусок/.test(text)) return "брусок";
  if (/брус/.test(text)) return "брус";
  if (/доск/.test(text)) return "доска";
  return "пиломатериал";
}

function categoryFor(name, categoryText) {
  const text = `${name} ${categoryText}`.toLowerCase();
  if (/(osb|осб|дсп|двп|оргалит|мдф|цсп)/.test(text)) return "dsp-mdf-osb";
  if (/(фанер|листов|плит)/.test(text)) return "fanera";
  if (/листвен/.test(text)) return "listvennitsa";
  if (/кедр/.test(text)) return "kedr";
  if (/(липа|осин)/.test(text)) return "lipa-osina";
  return "sosna-el";
}

function extractAttributeValues(row) {
  const values = [
    row[C.ATTR1_VALUE],
    row[C.ATTR2_VALUE],
    row[C.ATTR3_VALUE],
    row[C.ATTR4_VALUE],
    row[C.VARIATION_TITLE],
  ]
    .map((value) => clean(value))
    .filter(Boolean)
    .flatMap((value) => value.split("|"))
    .map((value) => clean(value))
    .filter(Boolean);

  return [...new Set(values)].slice(0, 4);
}

function isSheetOrProfile(name, categoryText) {
  const text = `${name} ${categoryText}`.toLowerCase();
  return /(фанер|osb|осб|дсп|двп|оргалит|мдф|цсп|лист|плит|вагонк|имитац|планкен|террас|палуб|полов|блок[\s-]?хаус|плинтус|наличник|полок)/.test(text);
}

function unitForVariant({ name, categoryText, size, price }) {
  const text = `${name} ${categoryText} ${size}`.toLowerCase();
  if (isSheetOrProfile(name, categoryText)) return "PIECE";
  if (/(доск|брус|брусок|лаги|обрез|строган|антисепт|сух)/.test(text) && price >= 6000) return "CUBE";
  if (/\d{1,4}\s*×\s*\d{1,4}\s*×\s*\d{3,5}/.test(size) && price >= 5000) return "CUBE";
  return "PIECE";
}

function piecesPerCube(size) {
  const normalized = normalizeSize(size);
  const match = normalized.match(/(\d{1,4})\s*×\s*(\d{1,4})\s*×\s*(\d{3,5})/);
  if (!match) return null;
  const a = Number(match[1]) / 1000;
  const b = Number(match[2]) / 1000;
  const c = Number(match[3]) / 1000;
  const volume = a * b * c;
  if (!Number.isFinite(volume) || volume <= 0) return null;
  return Math.max(1, Math.floor(1 / volume));
}

function stockQty(row) {
  const qty = parseNumber(row[C.STOCK_QTY]);
  if (qty === null) return null;
  return Math.max(0, Math.round(qty));
}

function makeShortDescription(name, categoryName) {
  const kind = productKind(name, categoryName);
  return `${name} — ${kind} для строительства и отделки. Проверим наличие, сортность и доставку перед отгрузкой.`;
}

function makeDescription(name, categoryName, variants) {
  const kind = productKind(name, categoryName);
  const sizes = variants
    .map((variant) => variant.size)
    .filter((size) => size && size !== "Стандарт")
    .slice(0, 8)
    .join(", ");
  const sizeText = sizes ? ` В наличии популярные размеры и варианты: ${sizes}.` : "";

  return `${name} — ${kind} из раздела «${categoryName}». Подходит для строительных, отделочных и производственных задач.${sizeText} ПилоРус уточняет наличие, сортность, цену партии и удобную доставку по Москве и Московской области перед оформлением заказа.`;
}

function saleUnitFromVariants(variants) {
  const units = new Set(variants.map((variant) => variant.unit));
  if (units.size === 1 && units.has("CUBE")) return "CUBE";
  if (units.size === 1 && units.has("PIECE")) return "PIECE";
  return "BOTH";
}

function createVariant(row, parentProduct) {
  const sourcePrice = getPrice(row);
  if (!sourcePrice || sourcePrice <= 0) return null;

  const attrValues = extractAttributeValues(row);
  const rowName = cleanProductName(row[C.NAME]);
  const baseSize = extractSize(rowName) || extractSize(parentProduct.name);
  const extraValues = attrValues
    .filter((value) => value !== baseSize)
    .filter((value) => !baseSize || !normalizeSize(value).includes(baseSize))
    .slice(0, 2);
  const size = normalizeSize([baseSize || "Стандарт", ...extraValues].filter(Boolean).join(" / "));
  const price = priceForPiloRus(sourcePrice);
  const unit = unitForVariant({
    name: parentProduct.name,
    categoryText: parentProduct.sourceCategoryText,
    size,
    price,
  });

  return {
    externalId: clean(row[C.ID]),
    sourceSku: clean(row[C.SKU]),
    size,
    unit,
    sourcePrice,
    price,
    pricePerCube: unit === "CUBE" ? price : null,
    pricePerPiece: unit === "PIECE" ? price : null,
    piecesPerCube: unit === "CUBE" ? piecesPerCube(size) : null,
    inStock: isInStock(row),
    stockQty: stockQty(row),
  };
}

function dedupeVariants(variants) {
  const byKey = new Map();
  for (const variant of variants) {
    const key = `${variant.size}::${variant.unit}`;
    const existing = byKey.get(key);
    if (!existing || variant.price < existing.price) {
      byKey.set(key, variant);
    }
  }
  return [...byKey.values()].map((variant, index) => ({ ...variant, sortOrder: index }));
}

function main() {
  const args = parseArgs();
  const csvPath = path.resolve(args.csv);
  const outPath = path.resolve(args.out);
  const reportPath = path.resolve(args.report);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const csv = fs.readFileSync(csvPath, "utf8");
  const [header, ...rows] = parseCsv(csv);
  if (!header || header.length < 40) {
    throw new Error("CSV header looks invalid");
  }

  const parentProducts = [];
  const productById = new Map();
  const productBySku = new Map();
  const stats = {
    csvRows: rows.length,
    sourceProducts: 0,
    sourceVariations: 0,
    skippedWithoutPrice: 0,
    skippedWithoutParent: 0,
    skippedWithoutImage: 0,
  };

  for (const row of rows) {
    if (!isPublished(row)) continue;
    const type = clean(row[C.TYPE]).toLowerCase();
    if (type !== "simple" && type !== "variable") continue;

    const name = cleanProductName(row[C.NAME]);
    if (!name) continue;

    const id = clean(row[C.ID]);
    const sku = clean(row[C.SKU]);
    const sourceCategoryText = clean(row[C.CATEGORIES]);
    const categorySlug = categoryFor(name, sourceCategoryText);
    const category = CATEGORY_DEFS[categorySlug];
    const images = splitImages(row[C.IMAGES]);
    const fallbackImage = category.image;

    const product = {
      id,
      sku,
      type,
      row,
      name,
      sourceCategoryText,
      categorySlug,
      categoryName: category.name,
      images: images.length ? images : [fallbackImage],
      variants: [],
    };

    parentProducts.push(product);
    productById.set(id, product);
    if (sku) productBySku.set(sku, product);
    stats.sourceProducts += 1;
  }

  for (const product of parentProducts) {
    if (product.type === "simple") {
      const variant = createVariant(product.row, product);
      if (variant) product.variants.push(variant);
      else stats.skippedWithoutPrice += 1;
    }
  }

  for (const row of rows) {
    if (!isPublished(row)) continue;
    if (clean(row[C.TYPE]).toLowerCase() !== "variation") continue;
    stats.sourceVariations += 1;

    const parentKey = clean(row[C.PARENT]).replace(/^id:/i, "");
    const parent = productById.get(parentKey) || productBySku.get(parentKey);
    if (!parent) {
      stats.skippedWithoutParent += 1;
      continue;
    }

    const variant = createVariant(row, parent);
    if (variant) parent.variants.push(variant);
    else stats.skippedWithoutPrice += 1;
  }

  const rawProducts = [];
  const seenSlugs = new Map();

  for (const product of parentProducts) {
    const variants = dedupeVariants(product.variants);
    if (!variants.length) continue;
    if (!product.images.length) {
      stats.skippedWithoutImage += 1;
      continue;
    }

    const baseSlug = slugify(product.name);
    const count = seenSlugs.get(baseSlug) || 0;
    seenSlugs.set(baseSlug, count + 1);
    const suffix = count ? `-${product.id || count + 1}` : product.id ? `-${product.id}` : "";
    const slug = `${baseSlug}${suffix}`.slice(0, 100).replace(/-+$/g, "");
    const category = CATEGORY_DEFS[product.categorySlug];

    rawProducts.push({
      externalId: product.id,
      sourceSku: product.sku,
      slug,
      name: product.name,
      categorySlug: product.categorySlug,
      images: product.images,
      shortDescription: makeShortDescription(product.name, category.name),
      description: makeDescription(product.name, category.name, variants),
      saleUnit: saleUnitFromVariants(variants),
      active: true,
      featured: false,
      variants,
    });
  }

  const products = groupProductsForStorefront(rawProducts);

  products.sort((a, b) => {
    const sortA = CATEGORY_DEFS[a.categorySlug]?.sortOrder ?? 999;
    const sortB = CATEGORY_DEFS[b.categorySlug]?.sortOrder ?? 999;
    return sortA - sortB || a.name.localeCompare(b.name, "ru");
  });

  const usedCategorySlugs = [...new Set(products.map((product) => product.categorySlug))];
  const categories = usedCategorySlugs
    .map((slug) => ({ slug, ...CATEGORY_DEFS[slug] }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceCsv: csvPath,
    sourcePriceFactor: PRICE_FACTOR,
    ...stats,
    snapshotProducts: products.length,
    snapshotVariants: products.reduce((sum, product) => sum + product.variants.length, 0),
    cubeVariants: products.reduce((sum, product) => sum + product.variants.filter((variant) => variant.unit === "CUBE").length, 0),
    pieceVariants: products.reduce((sum, product) => sum + product.variants.filter((variant) => variant.unit === "PIECE").length, 0),
    categoryCounts: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      products: products.filter((product) => product.categorySlug === category.slug).length,
    })),
    samples: products.slice(0, 8).map((product) => ({
      slug: product.slug,
      name: product.name,
      categorySlug: product.categorySlug,
      variants: product.variants.length,
      minPrice: Math.min(...product.variants.map((variant) => variant.price)),
      image: product.images[0],
    })),
  };

  const snapshot = {
    generatedAt: report.generatedAt,
    source: "Pilmos WooCommerce CSV",
    sourceCsv: csvPath,
    sourcePricePolicy: "PiloRus price = Pilmos CSV price * 0.99, rounded",
    priceFactor: PRICE_FACTOR,
    categories,
    products,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const mdPath = reportPath.replace(/\.json$/i, ".md");
  const lines = [
    "# Pilmos catalog snapshot",
    "",
    `- Generated: ${report.generatedAt}`,
    `- CSV rows: ${report.csvRows}`,
    `- Source products: ${report.sourceProducts}`,
    `- Source variations: ${report.sourceVariations}`,
    `- Snapshot products: ${report.snapshotProducts}`,
    `- Snapshot variants: ${report.snapshotVariants}`,
    `- Cube variants: ${report.cubeVariants}`,
    `- Piece variants: ${report.pieceVariants}`,
    `- Price policy: ${snapshot.sourcePricePolicy}`,
    "",
    "## Categories",
    ...report.categoryCounts.map((category) => `- ${category.name}: ${category.products}`),
    "",
    "## Samples",
    ...report.samples.map((sample) => `- ${sample.name} (${sample.variants} variants, from ${sample.minPrice} RUB)`),
    "",
  ];
  fs.writeFileSync(mdPath, `${lines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));
}

main();
