const SHORT_DESCRIPTION_MIN = 55;
const SHORT_DESCRIPTION_MAX = 155;

export function normalizeProductText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text || null;
}

export function makeShortProductDescription(
  description?: string | null,
  fallbackName?: string | null
): string {
  const text = normalizeProductText(description);
  if (text) {
    const sentence = text.match(/^.+?[.!?](?:\s|$)/)?.[0]?.trim();
    const candidate =
      sentence && sentence.length >= SHORT_DESCRIPTION_MIN && sentence.length <= SHORT_DESCRIPTION_MAX
        ? sentence
        : text;
    if (candidate.length <= SHORT_DESCRIPTION_MAX) return candidate;
    const clipped = candidate.slice(0, SHORT_DESCRIPTION_MAX - 3).trim();
    return `${clipped.replace(/[,\s;:-]+$/, "")}...`;
  }

  const name = normalizeProductText(fallbackName);
  return name ? `${name} от производителя с доставкой по Москве и Московской области.` : "";
}

export function isGoodShortProductDescription(value?: string | null): boolean {
  const text = normalizeProductText(value);
  return !!text && text.length >= SHORT_DESCRIPTION_MIN && text.length <= SHORT_DESCRIPTION_MAX;
}

export const PRODUCT_DESCRIPTION_LIMITS = {
  shortMin: SHORT_DESCRIPTION_MIN,
  shortMax: SHORT_DESCRIPTION_MAX,
  fullMin: 180,
  fullMax: 450,
} as const;
