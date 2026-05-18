import "server-only";

export type ArayDirectSiteMode = "owned-site" | "external-domain";

export type ArayDirectCampaignStatus =
  | "export-ready"
  | "active-campaign-protected"
  | "ready-for-next-stage"
  | "needs-domain"
  | "needs-direct"
  | "needs-region"
  | "needs-feed"
  | "needs-metrika"
  | "needs-goals"
  | "planned";

export type ArayDirectPackageInput = {
  siteMode: ArayDirectSiteMode;
  domain: string;
  businessName: string;
  directConnected: boolean;
  publicBaseUrlReady: boolean;
  regionIds: number[];
  productCount: number;
  productsWithPrice: number;
  productsInStock: number;
  productsWithImages: number;
  ymlUrl: string;
  metrikaCounterIds: number[];
  metrikaGoals: Record<string, string>;
  activeCampaignNames: string[];
};

export type ArayDirectCampaignPlan = {
  id: string;
  title: string;
  role: "capture" | "product-demand" | "network" | "return" | "brand";
  channel: string;
  status: ArayDirectCampaignStatus;
  canExportNow: boolean;
  implementedExport: boolean;
  budgetShare: number;
  why: string;
  includes: string[];
  needs: string[];
  officialBasis: string;
};

export type ArayDirectPackage = {
  siteMode: ArayDirectSiteMode;
  domain: string;
  businessName: string;
  readyScore: number;
  readyMax: number;
  summary: string;
  nextAction: string;
  feedReady: boolean;
  metrikaReady: boolean;
  goalsReady: boolean;
  searchDraftReady: boolean;
  campaigns: ArayDirectCampaignPlan[];
  safeguards: string[];
};

function compact(items: string[]) {
  return items.filter(Boolean);
}

function hasConversionGoal(goals: Record<string, string>) {
  return Boolean(goals.order || goals.lead || goals.checkout);
}

function hasMicroGoal(goals: Record<string, string>) {
  return Boolean(goals.phone || goals.messenger || goals.cart || goals.engaged);
}

function statusByReadiness(input: ArayDirectPackageInput) {
  if (!input.publicBaseUrlReady) return "needs-domain" as const;
  if (!input.directConnected) return "needs-direct" as const;
  if (!input.regionIds.length) return "needs-region" as const;
  return "export-ready" as const;
}

export function buildArayDirectPackage(
  input: ArayDirectPackageInput,
): ArayDirectPackage {
  const feedReady =
    input.productCount > 0 &&
    input.productsWithPrice > 0 &&
    input.productsInStock > 0 &&
    input.productsWithImages > 0 &&
    Boolean(input.ymlUrl);
  const metrikaReady = input.metrikaCounterIds.length > 0;
  const goalsReady = metrikaReady && hasConversionGoal(input.metrikaGoals) && hasMicroGoal(input.metrikaGoals);
  const baseSearchStatus = statusByReadiness(input);
  const searchDraftReady =
    baseSearchStatus === "export-ready" && input.productCount > 0;
  const hasActiveCampaign = input.activeCampaignNames.length > 0;

  const readyChecks = [
    input.publicBaseUrlReady,
    input.directConnected,
    input.regionIds.length > 0,
    input.productCount > 0,
    feedReady,
    metrikaReady,
    goalsReady,
  ];
  const readyScore = readyChecks.filter(Boolean).length;

  const searchStatus: ArayDirectCampaignStatus = !searchDraftReady
    ? baseSearchStatus
    : hasActiveCampaign
      ? "active-campaign-protected"
      : "export-ready";

  const productStatus: ArayDirectCampaignStatus = !feedReady
    ? "needs-feed"
    : !metrikaReady
      ? "needs-metrika"
      : "ready-for-next-stage";

  const networkStatus: ArayDirectCampaignStatus = !goalsReady
    ? "needs-goals"
    : "ready-for-next-stage";

  const externalNeeds =
    input.siteMode === "external-domain"
      ? [
          "проверить домен проекта",
          "подтвердить доступ владельца",
          "найти фид или распознать каталог",
        ]
      : [];

  const campaigns: ArayDirectCampaignPlan[] = [
    {
      id: "search_text_hot_demand",
      title: "Search demand: text and image ads",
      role: "capture",
      channel: "Поиск Яндекса",
      status: searchStatus,
      canExportNow: searchStatus === "export-ready",
      implementedExport: true,
      budgetShare: 45,
      why: "Сначала забирает самый горячий спрос и держит бюджет под контролем.",
      includes: [
        "catalog groups",
        "keywords",
        "negative keywords",
        "text ads",
        "quick links",
        "callouts",
        "UTM",
        "manual bid and daily budget guards",
      ],
      needs: compact([
        ...externalNeeds,
        !input.publicBaseUrlReady ? "публичный домен" : "",
        !input.directConnected ? "Direct-доступ" : "",
        !input.regionIds.length ? "регион Direct" : "",
        !input.productCount ? "товары каталога" : "",
        hasActiveCampaign ? "подтверждение дубля" : "",
      ]),
      officialBasis: "TextCampaign in Direct API",
    },
    {
      id: "product_gallery_upc",
      title: "Product gallery and unified performance",
      role: "product-demand",
      channel: "Поиск, товарная галерея, сети, карты",
      status: productStatus,
      canExportNow: false,
      implementedExport: false,
      budgetShare: 30,
      why: "Показывает товарные карточки с ценой, фото и ссылкой, когда фид и аналитика готовы.",
      includes: [
        "YML/feed source",
        "product titles",
        "prices",
        "availability",
        "images",
        "product URLs",
        "counter ids",
      ],
      needs: compact([
        ...externalNeeds,
        !feedReady ? "фид с ценами, наличием и фото" : "",
        !metrikaReady ? "счетчик Метрики" : "",
      ]),
      officialBasis: "UnifiedCampaign and product gallery",
    },
    {
      id: "network_retargeting",
      title: "Network and retargeting",
      role: "return",
      channel: "Рекламная сеть Яндекса",
      status: networkStatus,
      canExportNow: false,
      implementedExport: false,
      budgetShare: 15,
      why: "Возвращает теплых посетителей и тестирует аудитории только после настройки целей.",
      includes: [
        "cart audience",
        "checkout audience",
        "product viewers",
        "call and messenger goals",
        "separate budget",
      ],
      needs: compact([
        !metrikaReady ? "счетчик Метрики" : "",
        !goalsReady ? "главная и микроцели" : "",
      ]),
      officialBasis: "Metrika goals and audience-based campaigns",
    },
    {
      id: "media_reach",
      title: "Media and reach",
      role: "brand",
      channel: "Медийные и охватные размещения",
      status: "planned",
      canExportNow: false,
      implementedExport: false,
      budgetShare: 10,
      why: "Увеличивает брендовый спрос после того, как поиск и товарные кампании доказали экономику.",
      includes: [
        "display creatives",
        "frequency control",
        "separate budget",
        "brand message",
        "post-view analytics",
      ],
      needs: ["креативы", "бренд-бриф", "отдельный медийный бюджет"],
      officialBasis: "CpmBannerCampaign and reach campaigns",
    },
  ];

  return {
    siteMode: input.siteMode,
    domain: input.domain,
    businessName: input.businessName,
    readyScore,
    readyMax: readyChecks.length,
    summary:
      input.siteMode === "owned-site"
        ? "Наш сайт: ARAY использует каталог, фид, цены, фото и настройки админки."
        : "Сайт клиента: ARAY сначала анализирует домен и подтверждает доступ перед выгрузкой.",
    nextAction: hasActiveCampaign
      ? "Сначала проверь активную кампанию Direct, потом создавай новый черновик."
      : searchDraftReady
        ? "Сначала выгрузи остановленный поисковый черновик, потом готовь товарную галерею."
        : "Закрой обязательные проверки перед выгрузкой в Direct.",
    feedReady,
    metrikaReady,
    goalsReady,
    searchDraftReady,
    campaigns,
    safeguards: [
      "Бюджет не запускается автоматически.",
      "Дубль кампании не создается при активной кампании без отдельного подтверждения.",
      "Поиск, товарная галерея, сети и медийка живут с разными бюджетами.",
      "Сайт клиента требует анализа домена, подтверждения владельца и проверки посадочных.",
      "Товарная галерея ждет качественный фид и Метрику.",
    ],
  };
}
