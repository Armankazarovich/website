export type VariantOptionMeta = {
  fullLabel: string;
  cleanSize: string;
  section: string | null;
  length: string | null;
  grade: string | null;
  searchText: string;
};

export type VariantOptionKey = "grade" | "section" | "length";

const MULTIPLY_MARK = /[xXхХ×]/g;
const DIMENSION_RE =
  /(\d+(?:[.,]\d+)?)\s*[xXхХ×]\s*(\d+(?:[.,]\d+)?)(?:\s*[xXхХ×]\s*(\d+(?:[.,]\d+)?))?/;

function normalizeSpaces(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeSizeMarks(value: string) {
  return normalizeSpaces(value)
    .replace(MULTIPLY_MARK, "×")
    .replace(/\s*×\s*/g, "×")
    .replace(/\s+мм\b/gi, " мм")
    .replace(/\s+м\b/gi, " м");
}

function numberText(value: string) {
  const normalized = value.replace(",", ".");
  const number = Number(normalized);
  if (!Number.isFinite(number)) return value;
  return Number.isInteger(number)
    ? String(number)
    : number.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function toNumber(value: string | undefined) {
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function normalizeGrade(value: string) {
  const text = normalizeSpaces(value)
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*[-–]\s*/g, "-")
    .replace(/^сорт\b/i, "сорт")
    .replace(/\bсорт$/i, "сорт");

  const reverse = text.match(/^([A-Za-zА-Яа-яЁё0-9]+(?:-[A-Za-zА-Яа-яЁё0-9]+)?)\s+сорт$/i);
  if (reverse) return `сорт ${reverse[1]}`;

  return text;
}

function extractGrade(size: string) {
  const text = normalizeSizeMarks(size);
  const commaTail = text.split(",").slice(1).join(",").trim();
  if (commaTail && /(сорт|экстра|прима|^[ABСCАВВС0-9-]+$)/i.test(commaTail)) {
    return normalizeGrade(commaTail);
  }

  const sortMatch = text.match(
    /((?:Архангельский\s+лес,\s*)?сорт\s*[A-Za-zА-Яа-яЁё0-9]+(?:\s*[-–]\s*[A-Za-zА-Яа-яЁё0-9]+)?)/i,
  );
  if (sortMatch) return normalizeGrade(sortMatch[1]);

  const reverseMatch = text.match(/([A-Za-zА-Яа-яЁё0-9]+(?:\s*[-–]\s*[A-Za-zА-Яа-яЁё0-9]+)?)\s+сорт/i);
  if (reverseMatch) return normalizeGrade(`${reverseMatch[1]} сорт`);

  const namedMatch = text.match(/\b(экстра|прима)\b/i);
  return namedMatch ? normalizeGrade(namedMatch[1]) : null;
}

function cleanSizeLabel(size: string, grade: string | null) {
  let text = normalizeSizeMarks(size);
  if (text.includes(",")) {
    text = text.split(",")[0].trim();
  }

  if (grade) {
    text = normalizeSpaces(text.replace(grade, ""));
  }

  return normalizeSpaces(text.replace(/\s*,\s*$/g, "")) || normalizeSizeMarks(size);
}

function extractSection(size: string) {
  const match = normalizeSizeMarks(size).match(DIMENSION_RE);
  if (!match) return null;
  const first = toNumber(match[1]);
  const second = toNumber(match[2]);
  if (!first || !second) return null;

  const looksLikeTimberSection = first <= 300 && second <= 300;
  if (!looksLikeTimberSection) return null;

  return `${numberText(match[1])}×${numberText(match[2])}`;
}

function extractLength(size: string) {
  const text = normalizeSizeMarks(size);
  const range = text.match(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*м\b/i);
  if (range) return `${numberText(range[1])}–${numberText(range[2])} м`;

  const match = text.match(DIMENSION_RE);
  const third = toNumber(match?.[3]);
  if (!third) return null;

  if (third >= 1000) {
    return `${(third / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} м`;
  }

  if (/\d+\s*[xXхХ×]\s*\d+\s*[xXхХ×]\s*\d+(?:[.,]\d+)?\s*м\b/i.test(text)) {
    return `${numberText(match?.[3] || "")} м`;
  }

  return `${numberText(match?.[3] || "")} мм`;
}

function compareNatural(a: string, b: string) {
  return a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" });
}

function optionSortWeight(key: VariantOptionKey, value: string) {
  if (key === "grade") {
    const number = value.match(/\d+/)?.[0];
    if (number) return Number(number);
    if (/экстра/i.test(value)) return -20;
    if (/прима/i.test(value)) return -10;
    if (/\b(?:ab|ав)\b/i.test(value)) return 40;
    if (/\b(?:bc|вс)\b/i.test(value)) return 50;
  }

  const number = value.match(/\d+(?:[.,]\d+)?/)?.[0];
  return number ? Number(number.replace(",", ".")) : 999999;
}

export function compareVariantOptionValues(key: VariantOptionKey, a: string, b: string) {
  const byWeight = optionSortWeight(key, a) - optionSortWeight(key, b);
  return byWeight || compareNatural(a, b);
}

export function getVariantOptionMeta(size: string): VariantOptionMeta {
  const fullLabel = normalizeSizeMarks(size);
  const grade = extractGrade(fullLabel);
  const cleanSize = cleanSizeLabel(fullLabel, grade);
  const section = extractSection(fullLabel);
  const length = extractLength(fullLabel);
  const searchText = [fullLabel, cleanSize, section, length, grade].filter(Boolean).join(" ").toLowerCase();

  return {
    fullLabel,
    cleanSize,
    section,
    length,
    grade,
    searchText,
  };
}

export function uniqueVariantOptionValues(
  rows: Array<{ meta: VariantOptionMeta }>,
  key: VariantOptionKey,
) {
  return Array.from(new Set(rows.map((row) => row.meta[key]).filter((value): value is string => Boolean(value))))
    .sort((a, b) => compareVariantOptionValues(key, a, b));
}

export function matchesVariantQuery(meta: VariantOptionMeta, query: string) {
  const normalized = query.trim().toLowerCase();
  return !normalized || meta.searchText.includes(normalized);
}
