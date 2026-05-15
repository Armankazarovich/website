export type ProductInsightVariant = {
  size: string;
  inStock?: boolean;
};

export type ProductInsightInput = {
  name: string;
  category: string;
  shortDescription?: string | null;
  description?: string | null;
  saleUnit?: "CUBE" | "PIECE" | "BOTH" | string;
  variants: ProductInsightVariant[];
  cardTags?: string[] | null;
};

const MAX_CARD_TAGS = 3;
const MAX_TAG_LENGTH = 34;

export function normalizeProductCardTags(tags?: string[] | null) {
  if (!Array.isArray(tags)) return [];

  const seen = new Set<string>();
  return tags
    .map((tag) => String(tag ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, MAX_TAG_LENGTH))
    .filter((tag) => {
      const key = tag.toLowerCase().replace(/ё/g, "е");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CARD_TAGS);
}

function pluralSizeLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? "размер"
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
    ? "размера"
    : "размеров";

  return `${count} ${word}`;
}

export function buildProductInsightTags(input: ProductInsightInput) {
  const manualTags = normalizeProductCardTags(input.cardTags);
  if (manualTags.length > 0) return manualTags;

  return buildProductInsightSuggestions(input).slice(0, MAX_CARD_TAGS);
}

export function buildProductInsightSuggestions(input: ProductInsightInput) {
  const source = `${input.name} ${input.category} ${input.shortDescription || ""} ${input.description || ""} ${input.variants.map((v) => v.size).join(" ")}`
    .toLowerCase()
    .replace(/ё/g, "е");
  const tags: string[] = [];
  const add = (label: string) => {
    if (!tags.includes(label)) tags.push(label);
  };

  if (/террас|палуб/.test(source)) add("Для террасы");
  else if (/доска пола|пола|пол\b/.test(source)) add("Для пола");
  else if (/планкен|вагонк|имитац|блок-хаус|фасад/.test(source)) add("Для фасада");
  else if (/брус/.test(source)) add("Для каркаса");
  else if (/фанер|дсп|мдф|осб|лист/.test(source)) add("Листовой материал");
  else if (/доск/.test(source)) add("Для строительства");
  else add("Для заказа");

  if (/гост/.test(source)) add("ГОСТ");
  else if (/1\s*сорт|перв/.test(source)) add("1 сорт");
  else if (/\b(ab|ав)\b/.test(source)) add("AB");
  else if (/прима/.test(source)) add("Прима");
  else if (/камер|сух/.test(source)) add("Сухая");
  else if (/строган|планкен|вагонк|имитац/.test(source)) add("Строганая");

  if (input.variants.length >= 3) add(pluralSizeLabel(input.variants.length));
  add("Доставка 1-3 дня");

  return tags;
}
