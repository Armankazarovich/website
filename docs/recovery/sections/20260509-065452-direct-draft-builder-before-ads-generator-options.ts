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
};

export type DirectDraftGroup = {
  name: string;
  category: string;
  productsCount: number;
  keywords: string[];
  ads: DirectDraftAd[];
  quickLinks: Array<{ title: string; href: string }>;
};

export type DirectDraft = {
  campaignName: string;
  region: string;
  strategy: string;
  dailyBudgetHint: string;
  generatedAt: string;
  productsCount: number;
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

function categoryKeywords(category: string, products: DraftProduct[]) {
  const base = [
    `${category} купить`,
    `${category} цена`,
    `${category} с доставкой`,
    `${category} от производителя`,
    `${category} москва`,
  ];
  const productNames = products.slice(0, 6).flatMap((product) => [
    product.name,
    `${product.name} цена`,
  ]);
  return uniqueList([...base, ...productNames]).slice(0, 18);
}

export function buildYandexDirectDraft({
  products,
  settings,
  baseUrl,
  tenant,
}: {
  products: DraftProduct[];
  settings: Record<string, string | undefined>;
  baseUrl: string;
  tenant?: DraftTenant | null;
}): DirectDraft {
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
    settingValue(settings, ["delivery_region", "company_city", "service_region", "city"]) ||
    "Регион доставки";
  const campaignSlug = `${(tenant?.slug || company || "site").toLowerCase().replace(/[^a-z0-9а-яё]+/giu, "_")}_search_catalog`;

  const byCategory = new Map<string, DraftProduct[]>();
  for (const product of activeProducts) {
    const category = product.category?.name || "Каталог";
    byCategory.set(category, [...(byCategory.get(category) || []), product]);
  }

  const groups = Array.from(byCategory.entries()).slice(0, 14).map(([category, items]) => {
    const product = items.find((item) => getProductPrice(item)) || items[0];
    const price = getProductPrice(product);
    const categorySlug = product.category?.slug || "catalog";
    const href = productUrl(product, baseUrl, campaignSlug);
    const priceText = price ? `от ${price.toLocaleString("ru-RU")} ₽` : "цена по запросу";

    return {
      name: normalizeText(category, 60),
      category,
      productsCount: items.length,
      keywords: categoryKeywords(category, items),
      ads: [
        {
          title1: normalizeText(`${category} купить`, 56, 22),
          title2: normalizeText(`${priceText} · доставка`, 30),
          text: normalizeText(`${company}: ${category.toLowerCase()} ${priceText}. Доставка, самовывоз, помощь с подбором.`, 81, 23),
          href,
        },
        {
          title1: normalizeText(product.name, 56, 22),
          title2: normalizeText(`${priceText}`, 30),
          text: normalizeText(`Подберем ${category.toLowerCase()} под задачу. Реальные цены из каталога, быстрый заказ и связь с менеджером.`, 81, 23),
          href,
        },
      ],
      quickLinks: [
        { title: "Каталог", href: new URL("/catalog", baseUrl).toString() },
        { title: "Доставка", href: new URL("/delivery", baseUrl).toString() },
        { title: "Контакты", href: new URL("/contacts", baseUrl).toString() },
        { title: "Раздел", href: new URL(`/catalog?category=${encodeURIComponent(categorySlug)}`, baseUrl).toString() },
      ],
    };
  });

  return {
    campaignName: `${company} | Поиск | Каталог`,
    region,
    strategy: "Старт: ручной дневной лимит. После заявок — оптимизация по целям Метрики.",
    dailyBudgetHint: "Для первого теста: 500-1000 ₽/день, запуск после проверки владельцем.",
    generatedAt: new Date().toISOString(),
    productsCount: activeProducts.length,
    groups,
    negativeWords: buildNegativeWords(settings),
    checklist: [
      "Регион совпадает с зоной доставки.",
      "Ссылки открывают реальные категории или товары.",
      "Цены в объявлениях есть только там, где они есть в каталоге.",
      "Минус-слова добавлены на уровне кампании.",
      "Метрика и цели проверены до запуска бюджета.",
      "Запуск денег только после подтверждения владельца.",
    ],
  };
}
