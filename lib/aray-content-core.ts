export type ArayContentKind =
  | "product"
  | "service"
  | "promotion"
  | "story"
  | "page"
  | "ad";

export type ArayContentTone =
  | "steady"
  | "premium"
  | "friendly"
  | "technical"
  | "local";

export type ArayContentVariant = {
  size?: string | null;
  pricePerCube?: number | string | null;
  pricePerPiece?: number | string | null;
  inStock?: boolean | null;
};

export type ArayContentInput = {
  kind: ArayContentKind;
  title: string;
  description?: string | null;
  category?: string | null;
  price?: string | number | null;
  unit?: string | null;
  city?: string | null;
  region?: string | null;
  businessType?: string | null;
  tone?: ArayContentTone;
  variants?: ArayContentVariant[];
  benefits?: string[];
};

export type ArayContentDraft = {
  shortDescription: string;
  plainDescription: string;
  fullHtml: string;
  metaTitle: string;
  metaDescription: string;
  cardTags: string[];
  storyScript: string;
  adText: string;
  checklist: string[];
  source: "aray-content-core";
};

const KIND_LABEL: Record<ArayContentKind, string> = {
  product: "товар",
  service: "услуга",
  promotion: "акция",
  story: "сторис",
  page: "страница",
  ad: "реклама",
};

const DEFAULT_BENEFITS: Record<ArayContentKind, string[]> = {
  product: ["понятная цена", "размеры в наличии", "заявка уходит в CRM"],
  service: ["понятный следующий шаг", "заявка уходит в CRM", "Арай помогает не потерять клиента"],
  promotion: ["ясное условие", "ограниченный срок", "можно связать с рассылкой и рекламой"],
  story: ["короткий сценарий", "призыв к действию", "связь с товаром или услугой"],
  page: ["понятная структура", "SEO-логика", "готовый следующий шаг"],
  ad: ["честный оффер", "UTM-логика", "без обещаний, которых нет в данных"],
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clipText(value: string, max: number) {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trim().replace(/[,\s;:-]+$/, "")}...`;
}

function firstSentence(value: string) {
  const text = normalizeText(value);
  return text.match(/^.+?[.!?](?:\s|$)/)?.[0]?.trim() || text;
}

function uniqueList(values: Array<string | null | undefined>, limit = 8) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = normalizeText(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function formatPrice(value: string | number | null | undefined, unit?: string | null) {
  const price = normalizeText(value);
  const cleanUnit = normalizeText(unit);
  if (!price) return "";
  return `${price}${cleanUnit ? `, ${cleanUnit}` : ""}`;
}

function buildContextLine(input: ArayContentInput) {
  const category = normalizeText(input.category);
  const city = normalizeText(input.city);
  const region = normalizeText(input.region);
  const parts = [
    category ? `Категория: ${category}` : "",
    city ? `Город: ${city}` : "",
    region ? `Регион: ${region}` : "",
  ].filter(Boolean);
  return parts.join(". ");
}

function buildShortDescription(input: ArayContentInput) {
  const title = normalizeText(input.title) || "Предложение";
  const description = normalizeText(input.description);
  const kind = KIND_LABEL[input.kind];

  if (description.length >= 48) return clipText(firstSentence(description), 155);

  const category = normalizeText(input.category);
  const price = formatPrice(input.price, input.unit);
  const region = normalizeText(input.region) || normalizeText(input.city);
  const parts = [
    `${title} - ${kind} для понятной заявки и быстрого следующего шага.`,
    category ? `Подходит для направления: ${category}.` : "",
    price ? `Стоимость: ${price}.` : "",
    region ? `Работаем по ${region}.` : "",
  ].filter(Boolean);
  return clipText(parts.join(" "), 155);
}

function buildCardTags(input: ArayContentInput) {
  const benefits = uniqueList(input.benefits ?? [], 3);
  if (benefits.length >= 3) return benefits;

  const fallback = DEFAULT_BENEFITS[input.kind];
  const category = normalizeText(input.category);
  const price = normalizeText(input.price) ? "цена указана" : "";
  return uniqueList([...benefits, category, price, ...fallback], 3);
}

function buildChecklist(input: ArayContentInput) {
  const kind = KIND_LABEL[input.kind];
  const price = normalizeText(input.price);
  const variants = input.variants?.filter((variant) => normalizeText(variant.size)).length ?? 0;
  return [
    `Название ${kind} заполнено понятно`,
    "Короткое описание помещается в карточку",
    input.kind === "product" && variants > 0 ? `Размеров в данных: ${variants}` : "Есть понятный следующий шаг",
    price ? "Цена или стартовая стоимость указана" : "Цена может быть уточнена через заявку",
    "Текст можно вручную поправить перед публикацией",
  ];
}

function buildFullHtml(input: ArayContentInput, shortDescription: string, cardTags: string[]) {
  const title = normalizeText(input.title) || "Предложение";
  const context = buildContextLine(input);
  const price = formatPrice(input.price, input.unit);
  const sizes = uniqueList(input.variants?.map((variant) => variant.size) ?? [], 6);

  const details: string[] = [];
  if (context) details.push(context);
  if (sizes.length > 0) details.push(`Доступные варианты: ${sizes.join(", ")}.`);
  if (price) details.push(`Стоимость: ${price}. Итоговые условия фиксируются после уточнения задачи.`);
  if (!price) details.push("Стоимость уточняется после короткого согласования задачи, объема и сроков.");

  return `<p>${escapeHtml(shortDescription)}</p>
<ul>
${cardTags.map((tag) => `  <li>${escapeHtml(tag)}</li>`).join("\n")}
</ul>
${details.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n")}
<p><strong>Как работает ARAY:</strong> помогает оформить понятный текст, сохранить заявку в CRM и подсказать следующий шаг без лишней ручной работы.</p>
<p><strong>Подходит для:</strong> клиентов, которым нужно предложение «${escapeHtml(title)}» с честным описанием, понятной ценой и быстрым контактом.</p>`;
}

function buildPlainDescription(input: ArayContentInput, shortDescription: string) {
  const category = normalizeText(input.category);
  const price = formatPrice(input.price, input.unit);
  const city = normalizeText(input.city);
  const region = normalizeText(input.region);
  const sizes = uniqueList(input.variants?.map((variant) => variant.size) ?? [], 5);
  const parts = [
    shortDescription,
    category ? `Категория: ${category}.` : "",
    sizes.length ? `Доступные варианты: ${sizes.join(", ")}.` : "",
    price ? `Стоимость: ${price}.` : "",
    region || city ? `Работаем по ${region || city}.` : "",
    "Заявка сохраняется в CRM, а ARAY помогает менеджеру не потерять следующий шаг.",
  ].filter(Boolean);
  return clipText(parts.join(" "), 450);
}

function buildStoryScript(input: ArayContentInput, shortDescription: string) {
  const title = normalizeText(input.title) || "Предложение";
  return [
    `Кадр 1: показать ${title} крупно и спокойно.`,
    `Кадр 2: сказать коротко - ${shortDescription}`,
    "Кадр 3: показать цену, срок или главный результат.",
    "Кадр 4: предложить оставить заявку или открыть карточку.",
  ].join("\n");
}

function buildAdText(input: ArayContentInput, shortDescription: string) {
  const title = normalizeText(input.title) || "Предложение";
  const price = formatPrice(input.price, input.unit);
  const region = normalizeText(input.region) || normalizeText(input.city);
  return clipText(
    [
      `${title}`,
      price ? `от ${price}` : "",
      region ? region : "",
      shortDescription,
    ].filter(Boolean).join(". "),
    220,
  );
}

export function buildArayContentDraft(input: ArayContentInput): ArayContentDraft {
  const title = normalizeText(input.title) || "Предложение";
  const shortDescription = buildShortDescription(input);
  const cardTags = buildCardTags(input);
  const plainDescription = buildPlainDescription(input, shortDescription);
  const fullHtml = buildFullHtml(input, shortDescription, cardTags);
  const metaTitle = clipText(`${title} | ARAY`, 70);
  const metaDescription = clipText(shortDescription, 155);

  return {
    shortDescription,
    plainDescription,
    fullHtml,
    metaTitle,
    metaDescription,
    cardTags,
    storyScript: buildStoryScript(input, shortDescription),
    adText: buildAdText(input, shortDescription),
    checklist: buildChecklist(input),
    source: "aray-content-core",
  };
}
