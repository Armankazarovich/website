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
  const has = (pattern: RegExp) => pattern.test(source);

  if (has(/террас|палуб/)) add("Для террасы");
  else if (has(/доска пола|пола|пол\b/)) add("Для пола");
  else if (has(/планкен|вагонк|имитац|блок-хаус|фасад/)) add("Для фасада");
  else if (has(/плинтус|наличник|уголок|галтел|штапик/)) add("Для отделки");
  else if (has(/брус/)) add("Для каркаса");
  else if (has(/фанер|дсп|мдф|осб|лист/)) add("Листовой материал");
  else if (has(/доск/)) add("Для строительства");
  else add("Для заказа");

  if (has(/гост/)) add("ГОСТ");
  else if (has(/1\s*сорт|перв/)) add("1 сорт");
  else if (has(/\b(ab|ав)\b/)) add("AB");
  else if (has(/прима/)) add("Прима");
  else if (has(/камер|сух/)) add("Сухая");
  else if (has(/строган|планкен|вагонк|имитац/)) add("Строганая");

  if (tags.length < MAX_CARD_TAGS) {
    if (has(/внутрен|интерьер|помещ|стен/)) add("Для интерьера");
    else if (has(/липа|осина|сосна|ель|листвен|хвоя|дерев/)) add("Массив дерева");
    else if (has(/строител|мебел|отделоч/)) add("Для работ");
  }

  add("Доставка 1-3 дня");

  return tags;
}
