import "server-only";

type DraftProductVariant = {
  pricePerCube?: unknown;
  pricePerPiece?: unknown;
  inStock?: boolean | null;
};

type DraftProduct = {
  id: string;
  name: string;
  slug?: string | null;
  images?: string[];
  active?: boolean | null;
  category?: { name?: string | null; slug?: string | null } | null;
  variants?: DraftProductVariant[];
};

type DraftTenant = {
  slug?: string | null;
  name?: string | null;
  domain?: string | null;
};

export type DirectDraftAd = {
  title1: string;
  title2: string;
  text: string;
  href: string;
  imageUrls?: string[];
};

export type DirectDraftGroup = {
  name: string;
  category: string;
  productsCount: number;
  keywords: string[];
  ads: DirectDraftAd[];
  imageUrls: string[];
  quickLinks: Array<{ title: string; href: string; description?: string }>;
};

export type DirectDraftGenerationMode = "category" | "product";
export type DirectDraftAudienceMode = "search" | "retargeting" | "mixed";
export type DirectDraftScheduleMode = "business_hours" | "all_day" | "manual";
export type DirectDraftCampaignKind = "text" | "product" | "media";
export type DirectDraftPlacement = "search" | "network" | "both";

export type DirectDraftOptions = {
  grouping?: DirectDraftGenerationMode;
  campaignKind?: DirectDraftCampaignKind;
  placement?: DirectDraftPlacement;
  maxGroups?: number;
  maxKeywordsPerGroup?: number;
  maxAdsPerGroup?: number;
  includeImages?: boolean;
  dailyBudget?: number;
  schedule?: DirectDraftScheduleMode;
  timeFrom?: string;
  timeTo?: string;
  weekdays?: string;
  audienceMode?: DirectDraftAudienceMode;
  promoText?: string;
  quickLinksText?: string;
  region?: string;
};

export type DirectDraft = {
  campaignName: string;
  region: string;
  strategy: string;
  dailyBudgetHint: string;
  campaignKind: string;
  placement: string;
  promoText: string;
  audience: string;
  schedule: string;
  generatedAt: string;
  productsCount: number;
  generation: Required<Omit<DirectDraftOptions, "region">> & { region: string };
  groups: DirectDraftGroup[];
  negativeWords: string[];
  checklist: string[];
};

export const DIRECT_GENERIC_NEGATIVE_WORDS = [
  "бесплатно",
  "скачать",
  "фото",
  "картинка",
  "своими руками",
  "как сделать",
  "чертеж",
  "вакансия",
  "работа",
  "б/у",
  "бу",
  "даром",
  "реферат",
  "форум",
  "отзывы сотрудников",
];

function settingValue(settings: Record<string, string | undefined>, keys: string[]) {
  for (const key of keys) {
    const value = settings[key]?.trim();
    if (value) return value;
  }
  return "";
}

function splitList(value: string) {
  return value
    .split(/[\n,;]+/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function uniqueList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.toLowerCase()))).filter(Boolean);
}

function optionText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function optionBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return fallback;
  return ["1", "true", "yes", "on", "да"].includes(value.trim().toLowerCase());
}

export function normalizeDirectDraftOptions(options: Partial<Record<string, unknown>> = {}): Required<DirectDraftOptions> {
  const grouping = options.grouping === "product" ? "product" : "category";
  const campaignKind = options.campaignKind === "product" || options.campaignKind === "media" ? options.campaignKind : "text";
  const placement = options.placement === "network" || options.placement === "both" ? options.placement : "search";
  const schedule = options.schedule === "all_day" || options.schedule === "manual" ? options.schedule : "business_hours";
  const audienceMode = options.audienceMode === "retargeting" || options.audienceMode === "mixed" ? options.audienceMode : "search";
  const region = optionText(options.region);

  return {
    grouping,
    campaignKind,
    placement,
    maxGroups: optionNumber(options.maxGroups, 14, 1, 40),
    maxKeywordsPerGroup: optionNumber(options.maxKeywordsPerGroup, 18, 3, 30),
    maxAdsPerGroup: optionNumber(options.maxAdsPerGroup, 2, 1, 3),
    includeImages: optionBoolean(options.includeImages, true),
    dailyBudget: optionNumber(options.dailyBudget, 700, 300, 100000),
    schedule,
    timeFrom: normalizeTime(optionText(options.timeFrom), "09:00"),
    timeTo: normalizeTime(optionText(options.timeTo), "19:00"),
    weekdays: normalizeWeekdays(optionText(options.weekdays)),
    audienceMode,
    promoText: normalizeText(optionText(options.promoText), 48, 24),
    quickLinksText: optionText(options.quickLinksText).slice(0, 600),
    region,
  };
}

function buildNegativeWords(settings: Record<string, string | undefined>) {
  const custom = splitList(settingValue(settings, ["yandex_direct_negative_words", "direct_negative_words"]));
  return uniqueList([...DIRECT_GENERIC_NEGATIVE_WORDS, ...custom]);
}

function normalizeText(value: string, max = 56, maxWord = 22) {
  const clean = value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word.length > maxWord ? word.slice(0, maxWord) : word))
    .join(" ");
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function normalizeTime(value: string, fallback: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function normalizeWeekdays(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean || "Пн-Пт";
}

function firstRegionKeyword(region: string) {
  if (/москв/i.test(region)) return "москва";
  if (/санкт|петербург|спб/i.test(region)) return "спб";

  const first = region
    .split(/[,+/|]/g)[0]
    .replace(/область|край|республика|регион доставки/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return first.length >= 3 ? first : "";
}

function absoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function productImages(products: DraftProduct[], baseUrl: string, limit = 6) {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const image of products.flatMap((product) => product.images || [])) {
    const url = absoluteUrl(image, baseUrl);
    const key = url.toLowerCase();
    if (!url || seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
    if (urls.length >= limit) break;
  }

  return urls;
}

function getProductPrice(product: DraftProduct) {
  const prices = (product.variants || [])
    .flatMap((variant) => [variant.pricePerCube, variant.pricePerPiece])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  return prices.length ? Math.min(...prices) : null;
}

function productUrl(product: DraftProduct, baseUrl: string, campaign: string) {
  const url = new URL(product.slug ? `/product/${product.slug}` : "/catalog", baseUrl);
  url.searchParams.set("utm_source", "yandex_direct");
  url.searchParams.set("utm_medium", "cpc");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", product.slug || product.id);
  return url.toString();
}

function parseQuickLinks(value: string, baseUrl: string) {
  return value
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => {
      const [rawTitle, rawHref] = line.split(/[|=]/).map((part) => part.trim());
      const title = normalizeText(rawTitle || "Ссылка", 20, 18);
      const href = absoluteUrl(rawHref || "/catalog", baseUrl) || new URL("/catalog", baseUrl).toString();
      return { title, href };
    });
}

function buildQuickLinks({
  custom,
  baseUrl,
  categorySlug,
  productHref,
}: {
  custom: string;
  baseUrl: string;
  categorySlug: string;
  productHref: string;
}) {
  const customLinks = parseQuickLinks(custom, baseUrl);
  if (customLinks.length) return customLinks;

  return [
    { title: "Каталог", href: new URL("/catalog", baseUrl).toString() },
    { title: "Доставка", href: new URL("/delivery", baseUrl).toString() },
    { title: "Контакты", href: new URL("/contacts", baseUrl).toString() },
    { title: "Раздел", href: new URL(`/catalog?category=${encodeURIComponent(categorySlug)}`, baseUrl).toString() },
    { title: "Товар", href: productHref },
  ].slice(0, 4);
}

function scheduleText(options: Required<DirectDraftOptions>) {
  if (options.schedule === "all_day") return "Круглосуточно, после ручной проверки.";
  if (options.schedule === "manual") return `${options.weekdays}, ${options.timeFrom}-${options.timeTo}, после ручной проверки.`;
  return "Рабочее время бизнеса, после ручной проверки.";
}

function audienceText(mode: DirectDraftAudienceMode) {
  if (mode === "mixed") return "Поиск + ретаргетинг: ключевые фразы сейчас, аудитории Метрики следующим шагом.";
  if (mode === "retargeting") return "Ретаргетинг: нужен сегмент/цель Метрики перед выгрузкой аудитории.";
  return "Поиск: горячий спрос по ключевым фразам из каталога.";
}

function campaignKindText(kind: DirectDraftCampaignKind) {
  if (kind === "product") return "Товарная: объявления от товаров каталога, ссылки и фото из карточек.";
  if (kind === "media") return "Медийная: нужен баннер/креатив, сейчас ARAY готовит структуру и офферы.";
  return "Текстово-графическая: заголовки, тексты, ссылки, быстрые ссылки и ключевые фразы.";
}

function placementText(placement: DirectDraftPlacement) {
  if (placement === "network") return "РСЯ / сети: аудитории, интересы и ретаргетинг после проверки Метрики.";
  if (placement === "both") return "Поиск + РСЯ: разнести в отдельные кампании перед боевым запуском.";
  return "Поиск: показы по ключевым фразам.";
}

function categoryKeywords(category: string, products: DraftProduct[], region: string, limit: number) {
  const regionKeyword = firstRegionKeyword(region);
  const base = [
    `${category} купить`,
    `${category} цена`,
    `${category} с доставкой`,
    `${category} от производителя`,
    regionKeyword ? `${category} ${regionKeyword}` : "",
  ];
  const productNames = products.slice(0, 6).flatMap((product) => [
    product.name,
    `${product.name} цена`,
  ]);
  return uniqueList([...base, ...productNames]).slice(0, limit);
}

function productKeywords(product: DraftProduct, category: string, region: string, limit: number) {
  const regionKeyword = firstRegionKeyword(region);
  const base = [
    product.name,
    `${product.name} купить`,
    `${product.name} цена`,
    `${product.name} доставка`,
    `${category} купить`,
    `${category} цена`,
    regionKeyword ? `${product.name} ${regionKeyword}` : "",
  ];
  return uniqueList(base).slice(0, limit);
}

function buildGroupSeeds(activeProducts: DraftProduct[], grouping: DirectDraftGenerationMode, maxGroups: number) {
  if (grouping === "product") {
    return activeProducts.slice(0, maxGroups).map((product) => ({
      name: product.name,
      category: product.category?.name || "Каталог",
      products: [product],
    }));
  }

  const byCategory = new Map<string, DraftProduct[]>();
  for (const product of activeProducts) {
    const category = product.category?.name || "Каталог";
    byCategory.set(category, [...(byCategory.get(category) || []), product]);
  }

  return Array.from(byCategory.entries()).slice(0, maxGroups).map(([category, products]) => ({
    name: category,
    category,
    products,
  }));
}

export function buildYandexDirectDraft({
  products,
  settings,
  baseUrl,
  tenant,
  options,
}: {
  products: DraftProduct[];
  settings: Record<string, string | undefined>;
  baseUrl: string;
  tenant?: DraftTenant | null;
  options?: DirectDraftOptions;
}): DirectDraft {
  const normalizedOptions = normalizeDirectDraftOptions(options);
  const activeProducts = products
    .filter((product) => product.active !== false)
    .filter((product) => (product.variants || []).some((variant) => variant.inStock !== false || getProductPrice(product)))
    .slice(0, 80);
  const company =
    settingValue(settings, ["site_name", "company_name", "brand_name", "store_name"]) ||
    tenant?.name ||
    tenant?.slug ||
    "Каталог";
  const region =
    normalizedOptions.region ||
    settingValue(settings, ["delivery_region", "company_city", "service_region", "city"]) ||
    "Регион доставки";
  const campaignSlug = `${(tenant?.slug || company || "site").toLowerCase().replace(/[^a-z0-9а-яё]+/giu, "_")}_search_catalog`;
  const resolvedSchedule = scheduleText(normalizedOptions);
  const resolvedAudience = audienceText(normalizedOptions.audienceMode);
  const resolvedCampaignKind = campaignKindText(normalizedOptions.campaignKind);
  const resolvedPlacement = placementText(normalizedOptions.placement);
  const dailyBudgetHint = `Для первого теста: ${normalizedOptions.dailyBudget.toLocaleString("ru-RU")} ₽/день, запуск после проверки владельцем.`;

  const groups = buildGroupSeeds(activeProducts, normalizedOptions.grouping, normalizedOptions.maxGroups).map((seed) => {
    const { category, products: items } = seed;
    const product = items.find((item) => getProductPrice(item)) || items[0];
    const price = getProductPrice(product);
    const categorySlug = product.category?.slug || "catalog";
    const href = productUrl(product, baseUrl, campaignSlug);
    const priceText = price ? `от ${price.toLocaleString("ru-RU")} ₽` : "цена по запросу";
    const promo = normalizedOptions.promoText;
    const title2 = promo ? normalizeText(promo, 30) : normalizeText(`${priceText} · доставка`, 30);
    const offerText = promo ? `${promo}. ` : "";
    const imageUrls = normalizedOptions.includeImages ? productImages(items, baseUrl) : [];
    const keywords =
      normalizedOptions.grouping === "product"
        ? productKeywords(product, category, region, normalizedOptions.maxKeywordsPerGroup)
        : categoryKeywords(category, items, region, normalizedOptions.maxKeywordsPerGroup);

    return {
      name: normalizeText(seed.name, 60),
      category,
      productsCount: items.length,
      keywords,
      ads: [
        {
          title1: normalizeText(normalizedOptions.grouping === "product" ? `${product.name} купить` : `${category} купить`, 56, 22),
          title2,
          text: normalizeText(`${offerText}${company}: ${category.toLowerCase()} ${priceText}. Доставка, самовывоз, помощь с подбором.`, 81, 23),
          href,
          imageUrls,
        },
        {
          title1: normalizeText(product.name, 56, 22),
          title2: normalizeText(`${priceText}`, 30),
          text: normalizeText(`Подберем ${category.toLowerCase()} под задачу. Реальные цены из каталога, быстрый заказ и связь с менеджером.`, 81, 23),
          href,
          imageUrls,
        },
      ].slice(0, normalizedOptions.maxAdsPerGroup),
      imageUrls,
      quickLinks: buildQuickLinks({
        custom: normalizedOptions.quickLinksText,
        baseUrl,
        categorySlug,
        productHref: href,
      }),
    };
  });

  return {
    campaignName: `${company} | Поиск | Каталог`,
    region,
    strategy: "Старт: ручной дневной лимит. После заявок — оптимизация по целям Метрики.",
    dailyBudgetHint,
    campaignKind: resolvedCampaignKind,
    placement: resolvedPlacement,
    promoText: normalizedOptions.promoText,
    audience: resolvedAudience,
    schedule: resolvedSchedule,
    generatedAt: new Date().toISOString(),
    productsCount: activeProducts.length,
    generation: {
      grouping: normalizedOptions.grouping,
      campaignKind: normalizedOptions.campaignKind,
      placement: normalizedOptions.placement,
      maxGroups: normalizedOptions.maxGroups,
      maxKeywordsPerGroup: normalizedOptions.maxKeywordsPerGroup,
      maxAdsPerGroup: normalizedOptions.maxAdsPerGroup,
      includeImages: normalizedOptions.includeImages,
      dailyBudget: normalizedOptions.dailyBudget,
      schedule: normalizedOptions.schedule,
      timeFrom: normalizedOptions.timeFrom,
      timeTo: normalizedOptions.timeTo,
      weekdays: normalizedOptions.weekdays,
      audienceMode: normalizedOptions.audienceMode,
      promoText: normalizedOptions.promoText,
      quickLinksText: normalizedOptions.quickLinksText,
      region,
    },
    groups,
    negativeWords: buildNegativeWords(settings),
    checklist: [
      "Регион совпадает с зоной доставки.",
      "Ссылки открывают реальные категории или товары.",
      "Быстрые ссылки проверены и ведут на страницы текущего сайта.",
      "Аудитория выбрана под цель кампании.",
      "Тип кампании и площадка согласованы: поиск, сеть, медийная или товарная логика не смешаны без директолога.",
      "Фото товаров подтянуты в черновик там, где они есть в каталоге.",
      "Цены в объявлениях есть только там, где они есть в каталоге.",
      "График показов согласован до включения бюджета.",
      "Минус-слова добавлены на уровне кампании.",
      "Метрика и цели проверены до запуска бюджета.",
      "Запуск денег только после подтверждения владельца.",
    ],
  };
}
