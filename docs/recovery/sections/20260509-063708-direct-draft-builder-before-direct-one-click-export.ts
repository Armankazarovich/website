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

export const DIRECT_NEGATIVE_WORDS = [
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
  "пластик",
  "металл",
  "фанера",
  "дсп",
];

function normalizeText(value: string, max = 56) {
  const clean = value.replace(/\s+/g, " ").trim();
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
  return Array.from(new Set([...base, ...productNames].map((item) => item.toLowerCase()))).slice(0, 18);
}

export function buildYandexDirectDraft({
  products,
  settings,
  baseUrl,
}: {
  products: DraftProduct[];
  settings: Record<string, string | undefined>;
  baseUrl: string;
}) {
  const activeProducts = products
    .filter((product) => product.active !== false)
    .filter((product) => (product.variants || []).some((variant) => variant.inStock !== false || getProductPrice(product)))
    .slice(0, 80);
  const company = settings.site_name || settings.company_name || "ПилоРус";
  const region = settings.delivery_region || settings.company_city || "Москва и Московская область";
  const campaignSlug = "pilorus_search_catalog";

  const byCategory = new Map<string, DraftProduct[]>();
  for (const product of activeProducts) {
    const category = product.category?.name || "Пиломатериалы";
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
          title1: normalizeText(`${category} купить`, 56),
          title2: normalizeText(`${priceText} · доставка`, 30),
          text: normalizeText(`${company}: ${category.toLowerCase()} ${priceText}. Доставка, самовывоз, помощь с подбором размера.`, 81),
          href,
        },
        {
          title1: normalizeText(product.name, 56),
          title2: normalizeText(`${priceText}`, 30),
          text: normalizeText(`Подберем ${category.toLowerCase()} под задачу. Реальные цены из каталога, быстрый заказ и связь с менеджером.`, 81),
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
    negativeWords: DIRECT_NEGATIVE_WORDS,
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
