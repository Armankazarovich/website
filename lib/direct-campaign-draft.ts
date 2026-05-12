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

export type DirectDraftGroupProduct = {
  id: string;
  name: string;
  slug?: string | null;
  category: string;
  price: number | null;
};

export type DirectDraftGroup = {
  name: string;
  category: string;
  productsCount: number;
  products: DirectDraftGroupProduct[];
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
export type DirectDraftFeedSource = "catalog" | "yml" | "market";

export type DirectDraftOptions = {
  grouping?: DirectDraftGenerationMode;
  campaignKind?: DirectDraftCampaignKind;
  placement?: DirectDraftPlacement;
  feedSource?: DirectDraftFeedSource;
  feedOnlyInStock?: boolean;
  feedOnlyWithPrice?: boolean;
  feedCategoryFilter?: string;
  selectedCategoriesText?: string;
  selectedProductsText?: string;
  recommendationMode?: boolean;
  minPrice?: number;
  maxPrice?: number;
  maxGroups?: number;
  maxKeywordsPerGroup?: number;
  maxAdsPerGroup?: number;
  includeImages?: boolean;
  dailyBudget?: number;
  searchBid?: number;
  schedule?: DirectDraftScheduleMode;
  timeFrom?: string;
  timeTo?: string;
  weekdays?: string;
  audienceMode?: DirectDraftAudienceMode;
  promoText?: string;
  quickLinksText?: string;
  excludedKeywordsText?: string;
  region?: string;
};

export type DirectDraft = {
  campaignName: string;
  region: string;
  strategy: string;
  dailyBudgetHint: string;
  campaignKind: string;
  placement: string;
  feed: string;
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

function normalizeDirectKeywordPhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/б\s*\/\s*у/gi, "бу")
    .replace(/[^\p{L}\s"\[\]\-+!]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 7)
    .map((word) => (word.length > 35 ? word.slice(0, 35) : word))
    .join(" ");
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
  const feedSource = options.feedSource === "yml" || options.feedSource === "market" ? options.feedSource : "catalog";
  const schedule = options.schedule === "all_day" || options.schedule === "manual" ? options.schedule : "business_hours";
  const audienceMode = options.audienceMode === "retargeting" || options.audienceMode === "mixed" ? options.audienceMode : "search";
  const region = optionText(options.region);

  return {
    grouping,
    campaignKind,
    placement,
    feedSource,
    feedOnlyInStock: optionBoolean(options.feedOnlyInStock, true),
    feedOnlyWithPrice: optionBoolean(options.feedOnlyWithPrice, true),
    feedCategoryFilter: optionText(options.feedCategoryFilter),
    selectedCategoriesText: optionText(options.selectedCategoriesText).slice(0, 600),
    selectedProductsText: optionText(options.selectedProductsText).slice(0, 1200),
    recommendationMode: optionBoolean(options.recommendationMode, true),
    minPrice: optionNumber(options.minPrice, 0, 0, 100000000),
    maxPrice: optionNumber(options.maxPrice, 0, 0, 100000000),
    maxGroups: optionNumber(options.maxGroups, 4, 1, 40),
    maxKeywordsPerGroup: optionNumber(options.maxKeywordsPerGroup, 5, 3, 30),
    maxAdsPerGroup: optionNumber(options.maxAdsPerGroup, 1, 1, 3),
    includeImages: optionBoolean(options.includeImages, true),
    dailyBudget: optionNumber(options.dailyBudget, 300, 300, 100000),
    searchBid: optionNumber(options.searchBid, 35, 1, 5000),
    schedule,
    timeFrom: normalizeTime(optionText(options.timeFrom), "09:00"),
    timeTo: normalizeTime(optionText(options.timeTo), "19:00"),
    weekdays: normalizeWeekdays(optionText(options.weekdays)),
    audienceMode,
    promoText: normalizeText(optionText(options.promoText), 48, 24),
    quickLinksText: optionText(options.quickLinksText).slice(0, 600),
    excludedKeywordsText: optionText(options.excludedKeywordsText).slice(0, 600),
    region,
  };
}

function buildNegativeWords(settings: Record<string, string | undefined>, extra = "") {
  const custom = splitList(settingValue(settings, ["yandex_direct_negative_words", "direct_negative_words"]));
  const directologist = splitList(extra);
  return uniqueList([...DIRECT_GENERIC_NEGATIVE_WORDS, ...custom, ...directologist].map(normalizeDirectKeywordPhrase));
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

function productInStock(product: DraftProduct) {
  const variants = product.variants || [];
  return !variants.length || variants.some((variant) => variant.inStock !== false);
}

function normalizeSelectionToken(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function productMatchesSelection(product: DraftProduct, selectedProducts: string[]) {
  if (!selectedProducts.length) return true;
  const identities = [
    product.id,
    product.slug || "",
    product.name,
  ]
    .map(normalizeSelectionToken)
    .filter(Boolean);

  return selectedProducts.some((selected) =>
    identities.some((identity) => identity === selected || identity.includes(selected)),
  );
}

function productMatchesFeed(product: DraftProduct, options: Required<DirectDraftOptions>) {
  const price = getProductPrice(product);
  const category = product.category?.name || "";
  const selectedCategories = splitList(options.selectedCategoriesText).map((item) => item.toLowerCase());
  const selectedProducts = splitList(options.selectedProductsText).map(normalizeSelectionToken);
  if (options.feedOnlyInStock && !productInStock(product)) return false;
  if (options.feedOnlyWithPrice && !price) return false;
  if (selectedCategories.length && !selectedCategories.some((selected) => category.toLowerCase().includes(selected))) return false;
  if (!productMatchesSelection(product, selectedProducts)) return false;
  if (options.feedCategoryFilter && !category.toLowerCase().includes(options.feedCategoryFilter.toLowerCase())) return false;
  if (options.minPrice && (!price || price < options.minPrice)) return false;
  if (options.maxPrice && (!price || price > options.maxPrice)) return false;
  return true;
}

function directUtmContent(value: string) {
  const clean = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/giu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return clean || "catalog";
}

function withYandexDirectUtm(url: URL, campaign: string, content: string) {
  url.searchParams.set("utm_source", "yandex_direct");
  url.searchParams.set("utm_medium", "cpc");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", directUtmContent(content));
  return url.toString();
}

function directUrl(value: string, baseUrl: string, campaign: string, content: string) {
  try {
    return withYandexDirectUtm(new URL(value, baseUrl), campaign, content);
  } catch {
    return withYandexDirectUtm(new URL("/catalog", baseUrl), campaign, content);
  }
}

function productUrl(product: DraftProduct, baseUrl: string, campaign: string) {
  const path = product.slug ? `/product/${encodeURIComponent(product.slug)}` : "/catalog";
  return directUrl(path, baseUrl, campaign, product.slug || product.id);
}

function catalogUrl({
  baseUrl,
  campaign,
  content,
  categorySlug,
  options,
  includeFilters,
}: {
  baseUrl: string;
  campaign: string;
  content: string;
  categorySlug: string;
  options: Required<DirectDraftOptions>;
  includeFilters: boolean;
}) {
  const url = new URL("/catalog", baseUrl);
  if (categorySlug && categorySlug !== "catalog") {
    url.searchParams.set("category", categorySlug);
  }

  if (includeFilters) {
    if (options.feedOnlyInStock) url.searchParams.set("instock", "1");
    if (options.minPrice > 0) url.searchParams.set("minprice", String(options.minPrice));
    if (options.maxPrice > 0) url.searchParams.set("maxprice", String(options.maxPrice));
    if (options.feedOnlyWithPrice || options.minPrice > 0 || options.maxPrice > 0) {
      url.searchParams.set("sort", "price_asc");
    }
  }

  return withYandexDirectUtm(url, campaign, content);
}

function sameLink(a: string, b: string) {
  try {
    const first = new URL(a);
    const second = new URL(b);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      first.searchParams.delete(key);
      second.searchParams.delete(key);
    }
    return first.toString().toLowerCase() === second.toString().toLowerCase();
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}

function uniqueQuickLinks(links: Array<{ title: string; href: string; description?: string }>) {
  const unique: Array<{ title: string; href: string; description?: string }> = [];

  for (const link of links) {
    if (!link.href || unique.some((item) => sameLink(item.href, link.href))) continue;
    unique.push(link);
    if (unique.length >= 8) break;
  }

  return unique;
}

function parseQuickLinks(value: string, baseUrl: string, campaign: string, contentPrefix: string) {
  return value
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line, index) => {
      const [rawTitle, rawHref, rawDescription] = line.split(/[|=]/).map((part) => part.trim());
      const title = normalizeText(rawTitle || "Ссылка", 30, 20);
      const href = directUrl(rawHref || "/catalog", baseUrl, campaign, `${contentPrefix}_${index + 1}`);
      const description = rawDescription ? normalizeText(rawDescription, 60, 24) : undefined;
      return { title, href, description };
    });
}

function buildQuickLinks({
  custom,
  baseUrl,
  campaign,
  categorySlug,
  categoryHref,
  filterHref,
  productHref,
  landingHref,
}: {
  custom: string;
  baseUrl: string;
  campaign: string;
  categorySlug: string;
  categoryHref: string;
  filterHref: string;
  productHref: string;
  landingHref: string;
}) {
  const customLinks = parseQuickLinks(custom, baseUrl, campaign, `${categorySlug}_quick`);
  const smartLinks = [
    { title: "Раздел", href: categoryHref, description: "Подборка по категории" },
    { title: "Фильтр", href: filterHref, description: "В наличии и с ценой" },
    sameLink(productHref, landingHref) ? null : { title: "Товар", href: productHref, description: "Цена и характеристики" },
    { title: "Каталог", href: directUrl("/catalog", baseUrl, campaign, `${categorySlug}_catalog`), description: "Все товары и категории" },
    { title: "Доставка", href: directUrl("/delivery", baseUrl, campaign, `${categorySlug}_delivery`), description: "Сроки, зоны и стоимость" },
    { title: "Контакты", href: directUrl("/contacts", baseUrl, campaign, `${categorySlug}_contacts`), description: "Телефон, адрес и мессенджеры" },
  ].filter(Boolean) as Array<{ title: string; href: string; description?: string }>;

  return uniqueQuickLinks([...smartLinks, ...customLinks]);
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
  if (kind === "media") return "Медийная: нужен баннер/креатив, сейчас я готовлю структуру и офферы.";
  return "Текстово-графическая: заголовки, тексты, ссылки, быстрые ссылки и ключевые фразы.";
}

function placementText(placement: DirectDraftPlacement) {
  if (placement === "network") return "РСЯ / сети: аудитории, интересы и ретаргетинг после проверки Метрики.";
  if (placement === "both") return "Поиск + РСЯ: разнести в отдельные кампании перед боевым запуском.";
  return "Поиск: показы по ключевым фразам.";
}

function feedText(options: Required<DirectDraftOptions>) {
  const source = options.feedSource === "yml" ? "YML-фид сайта" : options.feedSource === "market" ? "Яндекс Маркет фид" : "Каталог сайта";
  const filters = [
    options.feedOnlyInStock ? "только в наличии" : "",
    options.feedOnlyWithPrice ? "только с ценой" : "",
    options.feedCategoryFilter ? `категория содержит "${options.feedCategoryFilter}"` : "",
    options.selectedCategoriesText ? `выбраны категории: ${options.selectedCategoriesText}` : "",
    options.selectedProductsText ? `выбраны товары: ${splitList(options.selectedProductsText).length}` : "",
    options.minPrice ? `от ${options.minPrice.toLocaleString("ru-RU")} ₽` : "",
    options.maxPrice ? `до ${options.maxPrice.toLocaleString("ru-RU")} ₽` : "",
  ].filter(Boolean);
  return `${source}${filters.length ? ` · ${filters.join(", ")}` : ""}`;
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

function compactProductName(value: string, category: string) {
  const clean = normalizeText(value, 48, 20);
  const categoryToken = category.toLowerCase().split(/\s+/)[0] || "";
  if (clean.length <= 42) return clean;
  if (categoryToken && !clean.toLowerCase().includes(categoryToken)) {
    return normalizeText(`${category} ${clean}`, 48, 18);
  }
  return clean;
}

function directAdTexts({
  company,
  category,
  productName,
  priceText,
  promo,
  grouping,
}: {
  company: string;
  category: string;
  productName: string;
  priceText: string;
  promo: string;
  grouping: DirectDraftGenerationMode;
}) {
  const offer = promo || "Доставка и самовывоз";
  const mainName = grouping === "product" ? compactProductName(productName, category) : category;
  const categoryLower = category.toLowerCase();

  return [
    {
      title1: normalizeText(`${mainName} купить`, 56, 22),
      title2: normalizeText(`${priceText} · ${offer}`, 30, 18),
      text: normalizeText(`${company}: ${categoryLower} ${priceText}. В наличии, честные цены, доставка и помощь с подбором.`, 81, 20),
    },
    {
      title1: normalizeText(`${mainName} с доставкой`, 56, 22),
      title2: normalizeText("Заказ с сайта", 30, 18),
      text: normalizeText(`Подберем ${categoryLower} под задачу. Актуальный каталог, быстрый заказ, менеджер на связи.`, 81, 20),
    },
    {
      title1: normalizeText(`${mainName} цена`, 56, 22),
      title2: normalizeText("Проверено ARAY", 30, 18),
      text: normalizeText(`Смотрите цены, наличие и варианты в каталоге. Заявка без лишних звонков, ответит специалист.`, 81, 20),
    },
  ];
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
    .filter((product) => productInStock(product) || Boolean(getProductPrice(product)))
    .filter((product) => productMatchesFeed(product, normalizedOptions))
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
  const resolvedFeed = feedText(normalizedOptions);
  const dailyBudgetHint = `Безопасный тест: ${normalizedOptions.dailyBudget.toLocaleString("ru-RU")} ₽/день, ставка до ${normalizedOptions.searchBid.toLocaleString("ru-RU")} ₽/клик. Запуск только вручную после проверки владельцем.`;

  const groups = buildGroupSeeds(activeProducts, normalizedOptions.grouping, normalizedOptions.maxGroups).map((seed) => {
    const { category, products: items } = seed;
    const product = items.find((item) => getProductPrice(item)) || items[0];
    const price = getProductPrice(product);
    const categorySlug = product.category?.slug || "catalog";
    const productHref = productUrl(product, baseUrl, campaignSlug);
    const categoryHref = catalogUrl({
      baseUrl,
      campaign: campaignSlug,
      content: `${categorySlug}_category`,
      categorySlug,
      options: normalizedOptions,
      includeFilters: false,
    });
    const filterHref = catalogUrl({
      baseUrl,
      campaign: campaignSlug,
      content: `${categorySlug}_filter`,
      categorySlug,
      options: normalizedOptions,
      includeFilters: true,
    });
    const href = normalizedOptions.grouping === "product" ? productHref : filterHref;
    const priceText = price ? `от ${price.toLocaleString("ru-RU")} ₽` : "цена по запросу";
    const promo = normalizedOptions.promoText;
    const imageUrls = normalizedOptions.includeImages ? productImages(items, baseUrl) : [];
    const keywords =
      normalizedOptions.grouping === "product"
        ? productKeywords(product, category, region, normalizedOptions.maxKeywordsPerGroup)
        : categoryKeywords(category, items, region, normalizedOptions.maxKeywordsPerGroup);
    const adTexts = directAdTexts({
      company,
      category,
      productName: product.name,
      priceText,
      promo,
      grouping: normalizedOptions.grouping,
    });

    return {
      name: normalizeText(seed.name, 60),
      category,
      productsCount: items.length,
      products: items.slice(0, 80).map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug || null,
        category: item.category?.name || category,
        price: getProductPrice(item),
      })),
      keywords,
      ads: adTexts.map((ad) => ({ ...ad, href, imageUrls })).slice(0, normalizedOptions.maxAdsPerGroup),
      imageUrls,
      quickLinks: buildQuickLinks({
        custom: normalizedOptions.quickLinksText,
        baseUrl,
        campaign: campaignSlug,
        categorySlug,
        categoryHref,
        filterHref,
        productHref,
        landingHref: href,
      }),
    };
  });

  return {
    campaignName: `${company} | Поиск | Каталог`,
    region,
    strategy: "Безопасный старт: только поиск, ручной дневной лимит. После заявок — оптимизация по целям Метрики.",
    dailyBudgetHint,
    campaignKind: resolvedCampaignKind,
    placement: resolvedPlacement,
    feed: resolvedFeed,
    promoText: normalizedOptions.promoText,
    audience: resolvedAudience,
    schedule: resolvedSchedule,
    generatedAt: new Date().toISOString(),
    productsCount: activeProducts.length,
    generation: {
      grouping: normalizedOptions.grouping,
      campaignKind: normalizedOptions.campaignKind,
      placement: normalizedOptions.placement,
      feedSource: normalizedOptions.feedSource,
      feedOnlyInStock: normalizedOptions.feedOnlyInStock,
      feedOnlyWithPrice: normalizedOptions.feedOnlyWithPrice,
      feedCategoryFilter: normalizedOptions.feedCategoryFilter,
      selectedCategoriesText: normalizedOptions.selectedCategoriesText,
      selectedProductsText: normalizedOptions.selectedProductsText,
      recommendationMode: normalizedOptions.recommendationMode,
      minPrice: normalizedOptions.minPrice,
      maxPrice: normalizedOptions.maxPrice,
      maxGroups: normalizedOptions.maxGroups,
      maxKeywordsPerGroup: normalizedOptions.maxKeywordsPerGroup,
      maxAdsPerGroup: normalizedOptions.maxAdsPerGroup,
      includeImages: normalizedOptions.includeImages,
      dailyBudget: normalizedOptions.dailyBudget,
      searchBid: normalizedOptions.searchBid,
      schedule: normalizedOptions.schedule,
      timeFrom: normalizedOptions.timeFrom,
      timeTo: normalizedOptions.timeTo,
      weekdays: normalizedOptions.weekdays,
      audienceMode: normalizedOptions.audienceMode,
      promoText: normalizedOptions.promoText,
      quickLinksText: normalizedOptions.quickLinksText,
      excludedKeywordsText: normalizedOptions.excludedKeywordsText,
      region,
    },
    groups,
    negativeWords: buildNegativeWords(settings, normalizedOptions.excludedKeywordsText),
    checklist: [
      "Регион совпадает с зоной доставки.",
      "Ссылки открывают реальные категории или товары.",
      "UTM-метки добавлены к посадочным страницам, чтобы заказы связывались с рекламой.",
      "Быстрые ссылки проверены и ведут на страницы текущего сайта.",
      "Аудитория выбрана под цель кампании.",
      "Тип кампании и площадка согласованы: поиск, сеть, медийная или товарная логика не смешаны без директолога.",
      "Фид и фильтры товаров проверены: в рекламу попадают только нужные товары текущего бизнеса.",
      normalizedOptions.recommendationMode
        ? "ARAY рекомендует настройки, но директолог или владелец подтверждает их перед выгрузкой."
        : "Настройки заданы вручную и требуют проверки перед выгрузкой.",
      "Фото товаров подтянуты в черновик там, где они есть в каталоге.",
      "Цены в объявлениях есть только там, где они есть в каталоге.",
      "График показов согласован до включения бюджета.",
      "Минус-слова добавлены на уровне кампании.",
      "Метрика и цели проверены до запуска бюджета.",
      "Запуск денег только после подтверждения владельца.",
    ],
  };
}
