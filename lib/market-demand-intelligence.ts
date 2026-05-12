export type DemandProviderKey = "yandex-wordstat" | "google-ads";

export type DemandProviderState = {
  key: DemandProviderKey;
  name: string;
  connected: boolean;
  status: "ready" | "needs_token";
  regionScope: string;
  limitText: string;
  pricingText: string;
  sourceUrl: string;
  capabilities: string[];
};

export type MarketDemandTopic = {
  phrase: string;
  source: "category" | "product" | "activity" | "manual";
  region: string;
  status: "ready_to_fetch" | "needs_provider";
  providers: DemandProviderKey[];
};

export type MarketDemandRequest = {
  category?: string | null;
  activity?: string | null;
  region?: string | null;
  country?: string | null;
  language?: string | null;
  products?: string[];
  manualQuery?: string | null;
};

export type MarketDemandResponse = {
  generatedAt: string;
  cacheTtlMinutes: number;
  region: string;
  language: string;
  summary: string;
  providers: DemandProviderState[];
  topics: MarketDemandTopic[];
  wordstat: WordstatTopicResult[];
  nextSteps: string[];
};

export type WordstatPhrase = {
  phrase: string;
  count: number;
};

export type WordstatTopicResult = {
  phrase: string;
  provider: "yandex-wordstat";
  available: boolean;
  totalCount: number;
  results: WordstatPhrase[];
  associations: WordstatPhrase[];
  error: string | null;
};

const WORDSTAT_LIMITS = "Wordstat Search API: лимит зависит от каталога и роли search-api.webSearch.user; в UI держим кеш 6 часов.";
const GOOGLE_LIMITS = "Google Keyword Planner: 1 запрос/сек на рекламный аккаунт для идей и исторических метрик.";
const WORDSTAT_TOP_URL = "https://searchapi.api.cloud.yandex.net/v2/wordstat/topRequests";

function normalizePhrase(value?: string | null) {
  return (value || "")
    .replace(/\s+/g, " ")
    .replace(/[|#<>[\]{}]/g, "")
    .trim();
}

function uniquePhrases(values: Array<string | null | undefined>, max = 12) {
  const seen = new Set<string>();
  const phrases: string[] = [];

  for (const value of values) {
    const phrase = normalizePhrase(value);
    const key = phrase.toLowerCase();
    if (!phrase || seen.has(key)) continue;
    seen.add(key);
    phrases.push(phrase);
    if (phrases.length >= max) break;
  }

  return phrases;
}

function providerStatus(env: NodeJS.ProcessEnv): DemandProviderState[] {
  const yandexSearchCredential =
    env.YANDEX_WORDSTAT_TOKEN ||
    env.YANDEX_SEARCH_API_TOKEN ||
    env.YANDEX_API_KEY ||
    env.YANDEX_IAM_TOKEN ||
    env.YANDEX_CLOUD_IAM_TOKEN ||
    env.YANDEX_CLOUD_OAUTH_TOKEN;
  const yandexConnected = Boolean(yandexSearchCredential && env.YANDEX_FOLDER_ID);
  const googleConnected = Boolean(env.GOOGLE_ADS_DEVELOPER_TOKEN && env.GOOGLE_ADS_CUSTOMER_ID);

  return [
    {
      key: "yandex-wordstat",
      name: "Yandex Wordstat",
      connected: yandexConnected,
      status: yandexConnected ? "ready" : "needs_token",
      regionScope: "Россия и регионы Wordstat",
      limitText: WORDSTAT_LIMITS,
      pricingText: "Preview сейчас не тарифицируется, но лимиты и правила могут измениться.",
      sourceUrl: "https://yandex.cloud/en/docs/search-api/concepts/wordstat",
      capabilities: ["топ запросов", "динамика", "регионы", "похожие запросы"],
    },
    {
      key: "google-ads",
      name: "Google Keyword Planner",
      connected: googleConnected,
      status: googleConnected ? "ready" : "needs_token",
      regionScope: "страны, языки и рынки Google Ads",
      limitText: GOOGLE_LIMITS,
      pricingText: "Нужен Google Ads developer token; дневная квота зависит от уровня доступа.",
      sourceUrl: "https://developers.google.com/google-ads/api/docs/best-practices/quotas",
      capabilities: ["мировые регионы", "языки", "похожие ключи", "исторические метрики"],
    },
  ];
}

function wordstatAuth(env: NodeJS.ProcessEnv) {
  const apiKey =
    env.YANDEX_WORDSTAT_TOKEN ||
    env.YANDEX_SEARCH_API_TOKEN ||
    env.YANDEX_API_KEY ||
    "";
  if (apiKey) return { header: `Api-Key ${apiKey}`, folderId: env.YANDEX_FOLDER_ID || "" };

  const iamToken =
    env.YANDEX_IAM_TOKEN ||
    env.YANDEX_CLOUD_IAM_TOKEN ||
    env.YANDEX_CLOUD_OAUTH_TOKEN ||
    "";
  if (iamToken) return { header: `Bearer ${iamToken}`, folderId: env.YANDEX_FOLDER_ID || "" };

  return { header: "", folderId: "" };
}

function regionCodes(region: string) {
  return region
    .split(/[,\s|]+/)
    .map((value) => value.replace(/[^\d]/g, ""))
    .filter(Boolean)
    .slice(0, 10);
}

function wordstatPhrase(value: { phrase?: string; count?: string | number }): WordstatPhrase {
  const count = Number(value.count || 0);
  return {
    phrase: normalizePhrase(value.phrase),
    count: Number.isFinite(count) ? count : 0,
  };
}

async function fetchYandexWordstatTop({
  phrase,
  region,
  env,
}: {
  phrase: string;
  region: string;
  env: NodeJS.ProcessEnv;
}): Promise<WordstatTopicResult> {
  const auth = wordstatAuth(env);
  const empty = (error: string | null): WordstatTopicResult => ({
    phrase,
    provider: "yandex-wordstat",
    available: false,
    totalCount: 0,
    results: [],
    associations: [],
    error,
  });

  if (!auth.header || !auth.folderId) {
    return empty("Нужны YANDEX_API_KEY/YANDEX_SEARCH_API_TOKEN и YANDEX_FOLDER_ID");
  }

  try {
    const response = await fetch(WORDSTAT_TOP_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: auth.header,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phrase,
        numPhrases: "20",
        regions: regionCodes(region),
        devices: ["DEVICE_ALL"],
        folderId: auth.folderId,
      }),
    });
    const data = (await response.json().catch(() => null)) as null | {
      totalCount?: string | number;
      results?: Array<{ phrase?: string; count?: string | number }>;
      associations?: Array<{ phrase?: string; count?: string | number }>;
      message?: string;
      error?: string;
    };
    if (!response.ok || data?.error) {
      return empty(data?.message || data?.error || `Wordstat HTTP ${response.status}`);
    }

    const totalCount = Number(data?.totalCount || 0);
    return {
      phrase,
      provider: "yandex-wordstat",
      available: true,
      totalCount: Number.isFinite(totalCount) ? totalCount : 0,
      results: (data?.results || []).map(wordstatPhrase).filter((item) => item.phrase),
      associations: (data?.associations || []).map(wordstatPhrase).filter((item) => item.phrase),
      error: null,
    };
  } catch (error) {
    return empty(error instanceof Error ? error.message : "Wordstat API недоступен");
  }
}

function buildSeedPhrases(input: MarketDemandRequest) {
  const category = normalizePhrase(input.category);
  const activity = normalizePhrase(input.activity);
  const manualQuery = normalizePhrase(input.manualQuery);
  const products = uniquePhrases(input.products || [], 8);
  const seeds: Array<{ phrase: string; source: MarketDemandTopic["source"] }> = [];

  if (manualQuery) seeds.push({ phrase: manualQuery, source: "manual" });
  if (category) {
    seeds.push({ phrase: category, source: "category" });
    seeds.push({ phrase: `купить ${category}`, source: "category" });
    seeds.push({ phrase: `${category} цена`, source: "category" });
    seeds.push({ phrase: `${category} оптом`, source: "category" });
  }
  if (activity) {
    seeds.push({ phrase: activity, source: "activity" });
    seeds.push({ phrase: `${activity} услуги`, source: "activity" });
  }
  for (const product of products) {
    seeds.push({ phrase: product, source: "product" });
    seeds.push({ phrase: `${product} цена`, source: "product" });
  }

  const unique = uniquePhrases(seeds.map((seed) => seed.phrase), 14);
  return unique.map((phrase) => seeds.find((seed) => seed.phrase === phrase) || { phrase, source: "manual" as const });
}

export function buildMarketDemandPlan(
  input: MarketDemandRequest,
  env: NodeJS.ProcessEnv = process.env,
): MarketDemandResponse {
  const providers = providerStatus(env);
  const readyProviders = providers.filter((provider) => provider.connected).map((provider) => provider.key);
  const region = normalizePhrase(input.region) || normalizePhrase(input.country) || "Россия";
  const language = normalizePhrase(input.language) || "ru";
  const topics = buildSeedPhrases(input).map<MarketDemandTopic>((seed) => ({
    phrase: seed.phrase,
    source: seed.source,
    region,
    status: readyProviders.length ? "ready_to_fetch" : "needs_provider",
    providers: readyProviders.length ? readyProviders : providers.map((provider) => provider.key),
  }));

  const summary = readyProviders.length
    ? "Подключение готово: можно обновлять спрос по товарам, категориям, видам деятельности, регионам и языкам."
    : "Система готова к Wordstat и Google Keyword Planner. Пока токены не подключены, спрос не рисуем и не выдаём за реальные данные.";

  return {
    generatedAt: new Date().toISOString(),
    cacheTtlMinutes: 360,
    region,
    language,
    summary,
    providers,
    topics,
    wordstat: [],
    nextSteps: [
      "Сначала обновлять спрос по категориям и топовым товарам, а не по каждому клику.",
      "Хранить результаты в кеше и показывать дату последнего обновления.",
      "Для России брать Wordstat, для мировых рынков и языков подключать Google Keyword Planner.",
      "Рекламные аудитории собирать из спроса, корзины, поисков, истории покупок и роли человека.",
    ],
  };
}

export async function buildMarketDemandReport(
  input: MarketDemandRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MarketDemandResponse> {
  const plan = buildMarketDemandPlan(input, env);
  const wordstatProvider = plan.providers.find((provider) => provider.key === "yandex-wordstat");
  if (!wordstatProvider?.connected) return plan;

  const wordstat: WordstatTopicResult[] = [];
  for (const topic of plan.topics.slice(0, 5)) {
    wordstat.push(
      await fetchYandexWordstatTop({
        phrase: topic.phrase,
        region: plan.region,
        env,
      }),
    );
  }

  return {
    ...plan,
    summary: wordstat.some((item) => item.available)
      ? "Wordstat подключен: показываю реальные частоты и похожие запросы, с кешем и без выдуманных данных."
      : plan.summary,
    wordstat,
  };
}
