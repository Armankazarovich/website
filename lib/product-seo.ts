/**
 * lib/product-seo.ts
 *
 * SEO-автоматизация для товаров:
 *  - generateProductDescription() — шаблонное описание из полей товара (мгновенно, бесплатно)
 *  - generateImageAlt() — alt-атрибут для фото из имени товара + контекста
 *  - isProductReadyForCatalog() — проверка готовности товара к публикации
 *  - getPublicProductsFilter() — Prisma where filter для публичного каталога (автоскрытие)
 *  - generateProductDescriptionAI() — опционально через ARAY (Claude Sonnet 4.6)
 *
 * Правила системы (МАНИФЕСТ Армана):
 *  1. Нет фото → товар невидим клиенту. Админ видит с меткой.
 *  2. Нет цены или нет в наличии (все варианты) → товар невидим клиенту.
 *  3. Пустое описание → шаблон автоматически при сохранении. ARAY "Улучшить" по кнопке.
 *  4. Alt-атрибут фото → генерируется автоматически при загрузке.
 *
 * Регион/город/компания — из SiteSettings (не hardcoded). Для multi-tenancy.
 */

import type { Prisma } from "@prisma/client";
import { getSetting, type DEFAULT_SETTINGS } from "@/lib/site-settings";

// ────────────────────────────────────────────────────────────
// Типы для генерации (минимальный контракт — не трогаем Prisma схему)
// ────────────────────────────────────────────────────────────

export type VariantForSeo = {
  size?: string | null;
  pricePerCube?: number | string | null | { toNumber?: () => number };
  pricePerPiece?: number | string | null | { toNumber?: () => number };
  inStock?: boolean;
};

export type ProductForSeo = {
  name: string;
  description?: string | null;
  category?: { name?: string | null } | null;
  variants?: VariantForSeo[];
};

// ────────────────────────────────────────────────────────────
// Вспомогательные функции
// ────────────────────────────────────────────────────────────

function toNumber(value: VariantForSeo["pricePerCube"]): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    const n = value.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function getMinPrice(variants: VariantForSeo[]): {
  value: number;
  unit: "м³" | "шт";
} | null {
  let minCube: number | null = null;
  let minPiece: number | null = null;
  for (const v of variants) {
    const cube = toNumber(v.pricePerCube);
    const piece = toNumber(v.pricePerPiece);
    if (cube != null && cube > 0 && (minCube == null || cube < minCube)) minCube = cube;
    if (piece != null && piece > 0 && (minPiece == null || piece < minPiece)) minPiece = piece;
  }
  if (minCube != null) return { value: minCube, unit: "м³" };
  if (minPiece != null) return { value: minPiece, unit: "шт" };
  return null;
}

function uniqueSizes(variants: VariantForSeo[]): string[] {
  const sizes = variants.map((v) => (v.size ?? "").trim()).filter(Boolean);
  return Array.from(new Set(sizes));
}

// ────────────────────────────────────────────────────────────
// 1. Шаблонное описание — мгновенное, бесплатное
// ────────────────────────────────────────────────────────────

/**
 * Генерирует SEO-описание из полей товара.
 * Никогда не вызывает внешние API. Работает всегда.
 *
 * @example
 *   generateProductDescription(product, settings)
 *   // "Купить Доска обрезная 25×150×6000 от производителя в Химках.
 *   //  Доступные размеры: 25×100×6000, 25×150×6000. Цена от 18 500 ₽/м³.
 *   //  Доставка по Москве и Московской области за 1–3 дня. Собственное производство с 2015 года."
 */
export function generateProductDescription(
  product: ProductForSeo,
  settings: Record<string, string>
): string {
  const city = getSetting(settings, "company_city") || "Химках";
  const region = getSetting(settings, "delivery_region") || "Москве и Московской области";
  const variants = product.variants ?? [];

  const parts: string[] = [];

  // Часть 1: что это + откуда
  parts.push(`Купить ${product.name} от производителя в ${city}.`);

  // Часть 2: доступные размеры
  const sizes = uniqueSizes(variants);
  if (sizes.length > 0) {
    if (sizes.length === 1) {
      parts.push(`Размер ${sizes[0]}.`);
    } else if (sizes.length <= 4) {
      parts.push(`Доступные размеры: ${sizes.join(", ")}.`);
    } else {
      parts.push(`Доступно ${sizes.length} размеров: ${sizes.slice(0, 3).join(", ")} и другие.`);
    }
  }

  // Часть 3: категория (если есть)
  const categoryName = product.category?.name?.trim();
  if (categoryName && !product.name.toLowerCase().includes(categoryName.toLowerCase())) {
    parts.push(`Категория: ${categoryName}.`);
  }

  // Часть 4: минимальная цена
  const minPrice = getMinPrice(variants);
  if (minPrice) {
    parts.push(`Цена от ${formatRub(minPrice.value)} ₽/${minPrice.unit}.`);
  }

  // Часть 5: доставка из настроек
  parts.push(`Доставка по ${formatDeliveryRegion(region)} за 1–3 рабочих дня.`);

  // Часть 6: доверие
  parts.push("Собственное производство, контроль качества на каждом этапе.");

  return parts.join(" ");
}

/**
 * Приводит регион в дательный падеж если он в именительном.
 * "Москва и Московская область" → "Москве и Московской области".
 * Если не угадали — оставляем как есть (менеджер может поправить).
 */
function formatDeliveryRegion(region: string): string {
  const map: Record<string, string> = {
    "Москва и Московская область": "Москве и Московской области",
    "Москва и МО": "Москве и Московской области",
    "Санкт-Петербург и Ленинградская область": "Санкт-Петербургу и Ленинградской области",
    "Краснодарский край": "Краснодарскому краю",
  };
  return map[region] ?? region;
}

// ────────────────────────────────────────────────────────────
// 2. Alt-атрибут для фото
// ────────────────────────────────────────────────────────────

/**
 * Генерирует alt-текст для фото товара.
 * @example
 *   generateImageAlt(product, { index: 0 })
 *   // "Доска обрезная 25×150×6000 — фото 1"
 */
export function generateImageAlt(
  product: ProductForSeo,
  opts: { index?: number; variantSize?: string } = {}
): string {
  const base = product.name.trim();
  const suffix = opts.variantSize
    ? ` ${opts.variantSize}`
    : "";
  const photo = typeof opts.index === "number" && opts.index > 0 ? ` — фото ${opts.index + 1}` : "";
  return `${base}${suffix}${photo}`.slice(0, 125); // разумная длина для SEO
}

// ────────────────────────────────────────────────────────────
// 3. Готовность к публичному каталогу
// ────────────────────────────────────────────────────────────

export type ProductReadinessIssue =
  | "no-images"
  | "no-variants"
  | "no-price"
  | "out-of-stock"
  | "no-description";

export type ProductReadiness = {
  ready: boolean; // виден ли клиентам (жёсткие правила 1-2)
  warnings: ProductReadinessIssue[]; // мягкие проблемы (SEO, описание)
  blockers: ProductReadinessIssue[]; // причины скрытия
};

/**
 * Проверяет готовность товара к показу на сайте.
 * Жёсткие блокеры (товар невидим клиенту):
 *   - no-images → нет фото
 *   - no-price → все варианты без цены
 *   - out-of-stock → все варианты не в наличии
 *   - no-variants → товар без вариантов
 * Мягкие warnings (товар виден, но хуже для SEO):
 *   - no-description → описание пустое или слишком короткое
 */
export function checkProductReadiness(
  product: ProductForSeo & { images?: string[]; active?: boolean }
): ProductReadiness {
  const blockers: ProductReadinessIssue[] = [];
  const warnings: ProductReadinessIssue[] = [];

  // Фото
  if (!product.images || product.images.length === 0) {
    blockers.push("no-images");
  }

  // Варианты
  const variants = product.variants ?? [];
  if (variants.length === 0) {
    blockers.push("no-variants");
  } else {
    // Есть ли хоть один вариант с ценой?
    const hasAnyPrice = variants.some((v) => {
      const cube = toNumber(v.pricePerCube);
      const piece = toNumber(v.pricePerPiece);
      return (cube != null && cube > 0) || (piece != null && piece > 0);
    });
    if (!hasAnyPrice) blockers.push("no-price");

    // Есть ли хоть один вариант в наличии?
    const hasAnyInStock = variants.some((v) => v.inStock !== false);
    if (!hasAnyInStock) blockers.push("out-of-stock");
  }

  // Описание
  const desc = (product.description ?? "").trim();
  if (desc.length < 40) warnings.push("no-description");

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
}

export function readinessIssueLabel(issue: ProductReadinessIssue): string {
  switch (issue) {
    case "no-images":
      return "Нет фото";
    case "no-variants":
      return "Нет вариантов";
    case "no-price":
      return "Нет цены";
    case "out-of-stock":
      return "Нет в наличии";
    case "no-description":
      return "Нет описания";
  }
}

// ────────────────────────────────────────────────────────────
// 4. Prisma where-filter для публичного каталога
// ────────────────────────────────────────────────────────────

/**
 * Возвращает фильтр для запросов ПУБЛИЧНОГО каталога.
 * Применять в: catalog page, product page, homepage, search, sitemap, YML feed.
 *
 * Пропускает только товары где:
 *  - active = true (не скрыт админом)
 *  - images не пустой (есть фото)
 *  - есть хотя бы один вариант С ценой И в наличии
 *
 * @example
 *   const products = await prisma.product.findMany({
 *     where: getPublicProductsFilter(),
 *     include: { variants: true, category: true },
 *   });
 */
export function getPublicProductsFilter(): Prisma.ProductWhereInput {
  return {
    active: true,
    images: { isEmpty: false },
    variants: {
      some: {
        inStock: true,
        OR: [
          { pricePerCube: { not: null, gt: 0 } },
          { pricePerPiece: { not: null, gt: 0 } },
        ],
      },
    },
  };
}

/**
 * Тот же фильтр, но для вложенных variants — чтобы в списке товара
 * клиенты видели только покупаемые варианты (с ценой и в наличии).
 */
export function getPublicVariantsFilter(): Prisma.ProductVariantWhereInput {
  return {
    inStock: true,
    OR: [
      { pricePerCube: { not: null, gt: 0 } },
      { pricePerPiece: { not: null, gt: 0 } },
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 5. ARAY-улучшение описания (Claude Sonnet 4.6)
// ────────────────────────────────────────────────────────────

/**
 * Переписывает описание товара через ARAY (Claude Sonnet 4.6).
 * Возвращает улучшенный текст или бросает ошибку.
 *
 * Используется только по явному запросу (кнопка "Улучшить").
 * Шаблонное описание остаётся fallback'ом.
 *
 * @throws Error если API недоступен / ключ не настроен
 */
export async function generateProductDescriptionAI(
  product: ProductForSeo,
  settings: Record<string, string>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ARAY_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не настроен");
  }

  const city = getSetting(settings, "company_city") || "Химки";
  const region = getSetting(settings, "delivery_region") || "Москва и Московская область";
  const variants = product.variants ?? [];
  const sizes = uniqueSizes(variants).slice(0, 8);
  const minPrice = getMinPrice(variants);

  const productContext = [
    `Название: ${product.name}`,
    product.category?.name ? `Категория: ${product.category.name}` : null,
    sizes.length ? `Размеры: ${sizes.join(", ")}` : null,
    minPrice ? `Цена от: ${formatRub(minPrice.value)} ₽/${minPrice.unit}` : null,
    product.description?.trim() ? `Текущее описание: ${product.description.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `Ты — редактор интернет-магазина пиломатериалов ПилоРус в ${city}. Пишешь SEO-описания товаров для клиентов, которые ищут дерево в поисковиках.

Принципы ARAY:
- свет, правда, честность, польза
- говоришь по делу, без воды и маркетинговых клише
- 2-3 коротких предложения, максимум 4
- упомяни где применяется материал (1 фраза)
- упомяни ключевые характеристики из данных (размер, порода если ясна из названия)
- упомяни доставку по ${region}
- НЕ используй слова "качественный", "надёжный", "лучший", "уникальный", "премиум"
- НЕ придумывай ГОСТ, сорт, влажность если этих данных нет
- Пиши естественно, как человек рассказывает другу

Ответ: ТОЛЬКО текст описания, без кавычек, без пояснений, без заголовка.`;

  const userPrompt = `Напиши описание для карточки товара на сайте:

${productContext}

Описание:`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ARAY API вернул ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) {
    throw new Error("ARAY вернул пустой ответ");
  }

  return text;
}
