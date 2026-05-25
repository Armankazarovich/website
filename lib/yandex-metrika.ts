import "server-only";

import { decryptSettingValue } from "@/lib/secure-settings";

export type MetrikaSettings = Record<string, string | undefined>;

export type ArayMetrikaGoalKey =
  | "order"
  | "lead"
  | "phone"
  | "messenger"
  | "cart"
  | "checkout"
  | "engaged";

export type ArayMetrikaGoals = Partial<Record<ArayMetrikaGoalKey, string>>;

type MetrikaGoal = {
  id?: number;
  name?: string;
  type?: string;
  duration?: number;
  conditions?: Array<{ type?: string; url?: string }>;
};

type MetrikaCounter = {
  id?: number;
  name?: string;
  site?: string;
  goals?: MetrikaGoal[];
};

type MetrikaStatRow = {
  dimensions?: Array<{ id?: string | number; name?: string }>;
  metrics?: number[];
};

type MetrikaStatResponse = {
  totals?: number[];
  data?: MetrikaStatRow[];
  contains_sensitive_data?: boolean;
  contains_sensetiva_data?: boolean;
};

export type MetrikaCounterSummary = {
  id: number;
  name: string;
  site: string;
  goalsCount: number;
};

export type YandexMetrikaStatus = {
  configured: boolean;
  connected: boolean;
  mode: "oauth-token" | "oauth-app" | "env-token" | "missing";
  checkedAt: string;
  selectedCounterId: number | null;
  counters: MetrikaCounterSummary[];
  storedGoals: ArayMetrikaGoals;
  error: string | null;
};

export type YandexMetrikaTrafficSummary = {
  connected: boolean;
  available: boolean;
  source: "yandex_metrika_stat";
  checkedAt: string;
  counterId: number | null;
  period: { from: string; to: string };
  visits: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  pageDepth: number;
  avgVisitDurationSeconds: number;
  goalReaches: number;
  conversionRate: number;
  sensitiveDataLimited: boolean;
  regions: Array<{
    id: string;
    name: string;
    visits: number;
    users: number;
    goalReaches: number;
  }>;
  sources: Array<{
    id: string;
    name: string;
    visits: number;
    users: number;
    goalReaches: number;
  }>;
  error: string | null;
};

export const ARAY_METRIKA_GOAL_SPECS = [
  {
    key: "order",
    settingKey: "yandex_metrika_goal_order_id",
    name: "ARAY: заказ оформлен",
    event: "aray_order_success",
    hint: "Срабатывает после успешного оформления заказа.",
    goal: {
      type: "action",
      conditions: [{ type: "exact", url: "aray_order_success" }],
      default_price: 1000,
    },
  },
  {
    key: "lead",
    settingKey: "yandex_metrika_goal_lead_id",
    name: "ARAY: заявка отправлена",
    event: "aray_lead_sent",
    hint: "Резервная главная цель для форм заявок.",
    goal: {
      type: "action",
      conditions: [{ type: "exact", url: "aray_lead_sent" }],
      default_price: 800,
    },
  },
  {
    key: "phone",
    settingKey: "yandex_metrika_goal_phone_id",
    name: "ARAY: клик по телефону",
    event: "aray_phone_click",
    hint: "Срабатывает при клике по ссылке телефона.",
    goal: {
      type: "action",
      conditions: [{ type: "exact", url: "aray_phone_click" }],
      default_price: 250,
    },
  },
  {
    key: "messenger",
    settingKey: "yandex_metrika_goal_messenger_id",
    name: "ARAY: переход в мессенджер",
    event: "aray_messenger_click",
    hint: "Срабатывает при переходе в WhatsApp, Telegram или другой мессенджер.",
    goal: {
      type: "action",
      conditions: [{ type: "exact", url: "aray_messenger_click" }],
      default_price: 250,
    },
  },
  {
    key: "cart",
    settingKey: "yandex_metrika_goal_cart_id",
    name: "ARAY: добавление в корзину",
    event: "aray_cart_add",
    hint: "Срабатывает, когда покупатель добавляет товар в корзину.",
    goal: {
      type: "action",
      conditions: [{ type: "exact", url: "aray_cart_add" }],
      default_price: 150,
    },
  },
  {
    key: "checkout",
    settingKey: "yandex_metrika_goal_checkout_id",
    name: "ARAY: начало оформления",
    event: "aray_checkout_start",
    hint: "Срабатывает при переходе к оформлению заказа.",
    goal: {
      type: "action",
      conditions: [{ type: "exact", url: "aray_checkout_start" }],
      default_price: 200,
    },
  },
  {
    key: "engaged",
    settingKey: "yandex_metrika_goal_engaged_id",
    name: "ARAY: вовлеченная сессия",
    event: "aray_engaged_session",
    hint: "Микроцель для обучения рекламы до первых заказов.",
    goal: {
      type: "visit_duration",
      duration: 60,
      default_price: 50,
    },
  },
] satisfies Array<{
  key: ArayMetrikaGoalKey;
  settingKey: string;
  name: string;
  event: string;
  hint: string;
  goal: Record<string, unknown>;
}>;

function settingValue(settings: MetrikaSettings | undefined, keys: string[]) {
  for (const key of keys) {
    const value = settings?.[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function getStoredMetrikaGoals(settings?: MetrikaSettings): ArayMetrikaGoals {
  const goals: ArayMetrikaGoals = {};
  for (const spec of ARAY_METRIKA_GOAL_SPECS) {
    const value = settingValue(settings, [spec.settingKey]).replace(/[^\d]/g, "");
    if (value) goals[spec.key] = value;
  }
  return goals;
}

export function getStoredMetrikaCounterId(settings?: MetrikaSettings) {
  const value = settingValue(settings, [
    "yandex_metrika_id",
    "yandex_metrika_counter_id",
    "metrika_counter_id",
  ]).replace(/[^\d]/g, "");
  return value ? Number(value) : null;
}

function getMetrikaTokenInfo(settings?: MetrikaSettings) {
  const settingsToken = settingValue(settings, [
    "yandex_metrika_oauth_token",
    "yandex_metrika_access_token",
    "yandex_metrika_token",
    "yandex_oauth_token",
    "yandex_access_token",
    "metrika_oauth_token",
    "metrika_access_token",
  ]);
  if (settingsToken) {
    return { token: decryptSettingValue(settingsToken), mode: "oauth-token" as const };
  }

  const envToken = (process.env.YANDEX_METRIKA_TOKEN || "").trim();
  if (envToken) return { token: envToken, mode: "env-token" as const };

  const envUnifiedToken = (
    process.env.YANDEX_OAUTH_TOKEN ||
    process.env.YANDEX_ACCESS_TOKEN ||
    ""
  ).trim();
  if (envUnifiedToken) return { token: envUnifiedToken, mode: "env-token" as const };

  return { token: "", mode: "missing" as const };
}

function hasMetrikaOAuthApp() {
  return Boolean(
    (process.env.YANDEX_METRIKA_CLIENT_ID &&
      process.env.YANDEX_METRIKA_CLIENT_SECRET) ||
      (process.env.YANDEX_OAUTH_CLIENT_ID &&
        process.env.YANDEX_OAUTH_CLIENT_SECRET) ||
      (process.env.YANDEX_LOGIN_CLIENT_ID &&
        process.env.YANDEX_LOGIN_CLIENT_SECRET),
  );
}

function responseSnippet(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function formatMetrikaDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statNumber(data: MetrikaStatResponse, index: number) {
  const value = data.totals?.[index] ?? 0;
  return Number.isFinite(value) ? Number(value) : 0;
}

export async function callYandexMetrika<T>(
  path: string,
  options: {
    settings?: MetrikaSettings;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
  } = {},
): Promise<T> {
  const { token } = getMetrikaTokenInfo(options.settings);
  if (!token) throw new Error("Yandex Metrika OAuth token is missing");

  const response = await fetch(
    `https://api-metrika.yandex.net/management/v1/${path.replace(/^\/+/, "")}`,
    {
      method: options.method || "GET",
      cache: "no-store",
      headers: {
        Authorization: `OAuth ${token}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    },
  );
  const rawText = await response.text();
  const data = (() => {
    if (!rawText.trim()) return null;
    try {
      return JSON.parse(rawText) as T & { error?: string; message?: string };
    } catch {
      return null;
    }
  })();

  if (!response.ok || data?.error) {
    const fallback = `Yandex Metrika API не ответил корректно: HTTP ${response.status}${rawText ? `, ${responseSnippet(rawText)}` : ""}`;
    throw new Error(data?.message || data?.error || fallback);
  }
  if (!data) throw new Error("Yandex Metrika API вернул пустой ответ");
  return data as T;
}

async function callYandexMetrikaStat(
  params: URLSearchParams,
  settings?: MetrikaSettings,
) {
  const { token } = getMetrikaTokenInfo(settings);
  if (!token) throw new Error("Yandex Metrika OAuth token is missing");

  const response = await fetch(
    `https://api-metrika.yandex.net/stat/v1/data?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `OAuth ${token}` },
    },
  );
  const rawText = await response.text();
  const data = (() => {
    if (!rawText.trim()) return null;
    try {
      return JSON.parse(rawText) as MetrikaStatResponse & {
        error?: string;
        message?: string;
      };
    } catch {
      return null;
    }
  })();

  if (!response.ok || data?.error) {
    const fallback = `Yandex Metrika Stat API не ответил корректно: HTTP ${response.status}${rawText ? `, ${responseSnippet(rawText)}` : ""}`;
    throw new Error(data?.message || data?.error || fallback);
  }
  if (!data) throw new Error("Yandex Metrika Stat API вернул пустой ответ");
  return data;
}

function metrikaTableRows(data: MetrikaStatResponse) {
  return (data.data || []).map((row) => {
    const dimension = row.dimensions?.[0];
    return {
      id: String(dimension?.id ?? dimension?.name ?? "unknown"),
      name: dimension?.name || String(dimension?.id || "Не определено"),
      visits: Number(row.metrics?.[0] ?? 0),
      users: Number(row.metrics?.[1] ?? 0),
      goalReaches: Number(row.metrics?.[2] ?? 0),
    };
  });
}

export async function getYandexMetrikaTrafficSummary({
  settings,
  from,
  to,
}: {
  settings?: MetrikaSettings;
  from: Date;
  to: Date;
}): Promise<YandexMetrikaTrafficSummary> {
  const { token } = getMetrikaTokenInfo(settings);
  const counterId = getStoredMetrikaCounterId(settings);
  const period = {
    from: formatMetrikaDate(from),
    to: formatMetrikaDate(to),
  };

  const empty = (
    connected: boolean,
    error: string | null,
  ): YandexMetrikaTrafficSummary => ({
    connected,
    available: false,
    source: "yandex_metrika_stat",
    checkedAt: new Date().toISOString(),
    counterId,
    period,
    visits: 0,
    users: 0,
    pageviews: 0,
    bounceRate: 0,
    pageDepth: 0,
    avgVisitDurationSeconds: 0,
    goalReaches: 0,
    conversionRate: 0,
    sensitiveDataLimited: false,
    regions: [],
    sources: [],
    error,
  });

  if (!token) return empty(false, "Метрика OAuth не подключена");
  if (!counterId) return empty(true, "Не указан номер счетчика Метрики");

  const baseParams = {
    ids: String(counterId),
    date1: period.from,
    date2: period.to,
    accuracy: "full",
    lang: "ru",
  };

  try {
    const summaryParams = new URLSearchParams({
      ...baseParams,
      metrics: [
        "ym:s:visits",
        "ym:s:users",
        "ym:s:pageviews",
        "ym:s:bounceRate",
        "ym:s:pageDepth",
        "ym:s:avgVisitDurationSeconds",
        "ym:s:sumGoalReachesAny",
        "ym:s:anyGoalConversionRate",
      ].join(","),
    });
    const regionsParams = new URLSearchParams({
      ...baseParams,
      dimensions: "ym:s:regionCity",
      metrics: "ym:s:visits,ym:s:users,ym:s:sumGoalReachesAny",
      limit: "8",
      sort: "-ym:s:visits",
    });
    const sourcesParams = new URLSearchParams({
      ...baseParams,
      dimensions: "ym:s:<attribution>TrafficSource",
      attribution: "lastsign",
      metrics: "ym:s:visits,ym:s:users,ym:s:sumGoalReachesAny",
      limit: "8",
      sort: "-ym:s:visits",
    });

    const [summary, regions, sources] = await Promise.all([
      callYandexMetrikaStat(summaryParams, settings),
      callYandexMetrikaStat(regionsParams, settings).catch(
        () => ({ data: [] }) as MetrikaStatResponse,
      ),
      callYandexMetrikaStat(sourcesParams, settings).catch(
        () => ({ data: [] }) as MetrikaStatResponse,
      ),
    ]);

    return {
      connected: true,
      available: true,
      source: "yandex_metrika_stat",
      checkedAt: new Date().toISOString(),
      counterId,
      period,
      visits: statNumber(summary, 0),
      users: statNumber(summary, 1),
      pageviews: statNumber(summary, 2),
      bounceRate: statNumber(summary, 3),
      pageDepth: statNumber(summary, 4),
      avgVisitDurationSeconds: statNumber(summary, 5),
      goalReaches: statNumber(summary, 6),
      conversionRate: statNumber(summary, 7),
      sensitiveDataLimited: Boolean(
        summary.contains_sensitive_data ||
          summary.contains_sensetiva_data ||
          regions.contains_sensitive_data ||
          regions.contains_sensetiva_data ||
          sources.contains_sensitive_data ||
          sources.contains_sensetiva_data,
      ),
      regions: metrikaTableRows(regions),
      sources: metrikaTableRows(sources),
      error: null,
    };
  } catch (error) {
    return empty(
      true,
      error instanceof Error
        ? error.message
        : "Не удалось получить статистику Метрики",
    );
  }
}

export async function getYandexMetrikaCounters(settings?: MetrikaSettings) {
  const data = await callYandexMetrika<{ counters?: MetrikaCounter[] }>(
    "counters?field=goals",
    { settings },
  );
  return (data.counters || []).filter((counter) => Number(counter.id) > 0);
}

export async function createYandexMetrikaCounter({
  settings,
  name,
  site,
}: {
  settings?: MetrikaSettings;
  name: string;
  site: string;
}) {
  const data = await callYandexMetrika<{ counter?: MetrikaCounter }>("counters", {
    settings,
    method: "POST",
    body: {
      counter: {
        name,
        site,
        favorite: true,
        counter_flags: {
          collect_first_party_data: true,
          direct_allow_use_goals_without_access: true,
        },
      },
    },
  });

  if (!data.counter?.id) {
    throw new Error("Метрика не вернула ID созданного счетчика");
  }

  return data.counter;
}

function goalMatchesSpec(goal: MetrikaGoal, spec: (typeof ARAY_METRIKA_GOAL_SPECS)[number]) {
  if (goal.name === spec.name) return true;
  if (spec.goal.type === "visit_duration") {
    return goal.type === "visit_duration" && goal.duration === spec.goal.duration;
  }
  return Boolean(
    goal.type === "action" &&
      goal.conditions?.some((condition) => condition.url === spec.event),
  );
}

export async function ensureArayMetrikaGoals({
  settings,
  counterId,
}: {
  settings?: MetrikaSettings;
  counterId: number;
}) {
  const counters = await getYandexMetrikaCounters(settings);
  const counter =
    counters.find((item) => Number(item.id) === counterId) || counters[0] || null;
  if (!counter?.id) throw new Error("Счетчик Метрики не найден в подключенном аккаунте");

  const goals: ArayMetrikaGoals = {};
  const created: string[] = [];
  const reused: string[] = [];

  for (const spec of ARAY_METRIKA_GOAL_SPECS) {
    const existing = (counter.goals || []).find((goal) => goalMatchesSpec(goal, spec));
    if (existing?.id) {
      goals[spec.key] = String(existing.id);
      reused.push(spec.name);
      continue;
    }

    const data = await callYandexMetrika<{ goal?: MetrikaGoal }>(
      `counter/${Number(counter.id)}/goals`,
      {
        settings,
        method: "POST",
        body: {
          goal: {
            name: spec.name,
            ...spec.goal,
          },
        },
      },
    );
    const id = data.goal?.id;
    if (!id) throw new Error(`Метрика не вернула ID цели "${spec.name}"`);
    goals[spec.key] = String(id);
    created.push(spec.name);
  }

  return {
    counterId: Number(counter.id),
    counterName: counter.name || `Счетчик #${counter.id}`,
    goals,
    created,
    reused,
  };
}

export async function getYandexMetrikaStatus(
  settings?: MetrikaSettings,
): Promise<YandexMetrikaStatus> {
  const tokenInfo = getMetrikaTokenInfo(settings);
  const selectedCounterId = getStoredMetrikaCounterId(settings);

  if (!tokenInfo.token) {
    return {
      configured: hasMetrikaOAuthApp(),
      connected: false,
      mode: hasMetrikaOAuthApp() ? "oauth-app" : "missing",
      checkedAt: new Date().toISOString(),
      selectedCounterId,
      counters: [],
      storedGoals: getStoredMetrikaGoals(settings),
      error: null,
    };
  }

  try {
    const counters = await getYandexMetrikaCounters(settings);
    return {
      configured: true,
      connected: true,
      mode: tokenInfo.mode,
      checkedAt: new Date().toISOString(),
      selectedCounterId: selectedCounterId || Number(counters[0]?.id || 0) || null,
      counters: counters.slice(0, 20).map((counter) => ({
        id: Number(counter.id),
        name: counter.name || `Счетчик #${counter.id}`,
        site: counter.site || "",
        goalsCount: counter.goals?.length || 0,
      })),
      storedGoals: getStoredMetrikaGoals(settings),
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      mode: tokenInfo.mode,
      checkedAt: new Date().toISOString(),
      selectedCounterId,
      counters: [],
      storedGoals: getStoredMetrikaGoals(settings),
      error: error instanceof Error ? error.message : "Yandex Metrika API недоступен",
    };
  }
}
