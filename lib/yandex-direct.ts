import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { decryptSettingValue } from "@/lib/secure-settings";

type DirectCampaign = {
  Id?: number;
  Name?: string;
  State?: string;
  Status?: string;
  Type?: string;
  StartDate?: string;
};

type DirectSettings = Record<string, string | undefined>;

type DirectErrorPayload = {
  error?: {
    error_detail?: string;
    message?: string;
  };
};

type DirectReportRow = Record<string, string | undefined>;

export type YandexDirectStatus = {
  configured: boolean;
  connected: boolean;
  mode: "oauth-token" | "oauth-app" | "missing";
  checkedAt: string;
  campaignsCount: number;
  campaigns: Array<{
    id: number;
    name: string;
    state: string;
    status: string;
    type: string;
    startDate: string | null;
  }>;
  error: string | null;
};

export type YandexDirectSpendSummary = {
  connected: boolean;
  available: boolean;
  source: "yandex_direct_reports";
  checkedAt: string;
  period: { from: string; to: string };
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionRate: number;
  costPerConversion: number;
  sessions: number;
  bounceRate: number;
  campaigns: Array<{
    id: number;
    name: string;
    spend: number;
    clicks: number;
    impressions: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionRate: number;
    costPerConversion: number;
    sessions: number;
    bounceRate: number;
  }>;
  error: string | null;
};

function settingValue(settings: DirectSettings | undefined, keys: string[]) {
  for (const key of keys) {
    const value = settings?.[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function hasYandexDirectToken(settings?: DirectSettings) {
  return Boolean(getDirectToken(settings));
}

function getDirectToken(settings?: DirectSettings) {
  const settingsToken = settingValue(settings, [
    "yandex_direct_oauth_token",
    "yandex_direct_access_token",
    "yandex_direct_token",
    "yandex_oauth_token",
    "yandex_access_token",
    "direct_oauth_token",
    "direct_access_token",
  ]);
  if (settingsToken) return decryptSettingValue(settingsToken);

  const envToken = (
    process.env.YANDEX_DIRECT_OAUTH_TOKEN ||
    process.env.YANDEX_DIRECT_ACCESS_TOKEN ||
    process.env.YANDEX_DIRECT_TOKEN ||
    process.env.YANDEX_OAUTH_TOKEN ||
    process.env.YANDEX_ACCESS_TOKEN ||
    ""
  ).trim();
  if (envToken) return envToken;
  if (process.env.NODE_ENV === "production") return "";

  const localFiles = [
    path.resolve(process.cwd(), "..", "API", "Яндекс Директ API.txt"),
    path.resolve(process.cwd(), "..", "__test-direct.js"),
  ];
  for (const file of localFiles) {
    try {
      if (!existsSync(file)) continue;
      const text = readFileSync(file, "utf8");
      const oauthLine = text.match(
        /^\s*([A-Za-z0-9._~+-]+)\s*-\s*oauth\s+token/im,
      );
      if (oauthLine?.[1]) return oauthLine[1].trim();
      const tokenConst = text.match(/const\s+TOKEN\s*=\s*['"`]([^'"`]+)['"`]/);
      if (tokenConst?.[1]) return tokenConst[1].trim();
    } catch {
      // Local developer fallback only; production must use environment variables.
    }
  }

  return "";
}

function getDirectApiBase(settings?: DirectSettings) {
  return (
    settingValue(settings, ["yandex_direct_api_url", "direct_api_url"]) ||
    process.env.YANDEX_DIRECT_API_URL ||
    "https://api.direct.yandex.com/json/v5/"
  )
    .trim()
    .replace(/\/?$/, "/");
}

function getDirectReportsUrl(settings?: DirectSettings) {
  return new URL("reports", getDirectApiBase(settings)).toString();
}

function getDirectClientLogin(settings?: DirectSettings) {
  return (
    settingValue(settings, [
      "yandex_direct_client_login",
      "direct_client_login",
    ]) ||
    process.env.YANDEX_DIRECT_CLIENT_LOGIN ||
    process.env.DIRECT_CLIENT_LOGIN ||
    ""
  ).trim();
}

function responseSnippet(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function directErrorMessage(data: DirectErrorPayload | null, fallback: string) {
  return data?.error?.error_detail || data?.error?.message || fallback;
}

function formatDirectDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReportNumber(value: string | undefined) {
  const normalized = (value || "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDirectReportTsv(text: string): DirectReportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(
      headers.map((header, index) => [header, cells[index] || ""]),
    ) as DirectReportRow;
  });
}

export async function callYandexDirect<T>(
  service: string,
  payload: unknown,
  options: { settings?: DirectSettings } = {},
): Promise<T> {
  const token = getDirectToken(options.settings);
  if (!token)
    throw new Error("Yandex Direct OAuth token is missing for current tenant");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Accept-Language": "ru",
    "Content-Type": "application/json; charset=utf-8",
  };
  const clientLogin = getDirectClientLogin(options.settings);
  if (clientLogin) headers["Client-Login"] = clientLogin;

  const res = await fetch(
    `${getDirectApiBase(options.settings)}${service.replace(/^\/+/, "")}`,
    {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify(payload),
    },
  );
  const rawText = await res.text();
  const data = (() => {
    if (!rawText.trim()) return null;
    try {
      return JSON.parse(rawText) as T & DirectErrorPayload;
    } catch {
      return null;
    }
  })();

  if (!res.ok || data?.error) {
    const fallback = `Yandex Direct API не ответил корректно: HTTP ${res.status}${rawText ? `, ${responseSnippet(rawText)}` : ""}`;
    throw new Error(directErrorMessage(data, fallback));
  }

  if (!data) {
    throw new Error(
      `Yandex Direct API вернул пустой или нечитаемый ответ${rawText ? `: ${responseSnippet(rawText)}` : ""}`,
    );
  }

  return data as T;
}

export async function getYandexDirectSpendSummary({
  settings,
  from,
  to,
}: {
  settings?: DirectSettings;
  from: Date;
  to: Date;
}): Promise<YandexDirectSpendSummary> {
  const token = getDirectToken(settings);
  const period = {
    from: formatDirectDate(from),
    to: formatDirectDate(to),
  };

  const empty = (
    connected: boolean,
    error: string | null,
  ): YandexDirectSpendSummary => ({
    connected,
    available: false,
    source: "yandex_direct_reports",
    checkedAt: new Date().toISOString(),
    period,
    spend: 0,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    avgCpc: 0,
    conversions: 0,
    conversionRate: 0,
    costPerConversion: 0,
    sessions: 0,
    bounceRate: 0,
    campaigns: [],
    error,
  });

  if (!token) return empty(false, "Direct OAuth не подключен");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Accept-Language": "ru",
    "Content-Type": "application/json; charset=utf-8",
    processingMode: "online",
    returnMoneyInMicros: "false",
    skipReportHeader: "true",
    skipReportSummary: "true",
  };
  const clientLogin = getDirectClientLogin(settings);
  if (clientLogin) headers["Client-Login"] = clientLogin;

  const body = {
    params: {
      SelectionCriteria: {
        DateFrom: period.from,
        DateTo: period.to,
      },
      FieldNames: [
        "CampaignId",
        "CampaignName",
        "Impressions",
        "Clicks",
        "Ctr",
        "Cost",
        "AvgCpc",
        "Conversions",
        "ConversionRate",
        "CostPerConversion",
        "Sessions",
        "BounceRate",
      ],
      ReportName: `aray_finance_spend_${Date.now()}`,
      ReportType: "CAMPAIGN_PERFORMANCE_REPORT",
      DateRangeType: "CUSTOM_DATE",
      Format: "TSV",
      IncludeVAT: "YES",
      IncludeDiscount: "NO",
    },
  };

  try {
    const response = await fetch(getDirectReportsUrl(settings), {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();

    if (response.status === 201 || response.status === 202) {
      return empty(
        true,
        "Direct готовит отчет. Повторите обновление через минуту.",
      );
    }

    if (!response.ok) {
      const payload = (() => {
        try {
          return JSON.parse(text) as DirectErrorPayload;
        } catch {
          return null;
        }
      })();
      const fallback = `Direct Reports API не ответил корректно: HTTP ${response.status}${text ? `, ${responseSnippet(text)}` : ""}`;
      return empty(true, directErrorMessage(payload, fallback));
    }

    const rows = parseDirectReportTsv(text);
    const campaigns = rows
      .map((row) => ({
        id: Math.trunc(parseReportNumber(row.CampaignId)),
        name: row.CampaignName || "Кампания без названия",
        spend: parseReportNumber(row.Cost),
        clicks: Math.trunc(parseReportNumber(row.Clicks)),
        impressions: Math.trunc(parseReportNumber(row.Impressions)),
        ctr: parseReportNumber(row.Ctr),
        avgCpc: parseReportNumber(row.AvgCpc),
        conversions: parseReportNumber(row.Conversions),
        conversionRate: parseReportNumber(row.ConversionRate),
        costPerConversion: parseReportNumber(row.CostPerConversion),
        sessions: Math.trunc(parseReportNumber(row.Sessions)),
        bounceRate: parseReportNumber(row.BounceRate),
      }))
      .filter((campaign) => campaign.id || campaign.spend || campaign.clicks);

    const totalSpend = campaigns.reduce(
      (sum, campaign) => sum + campaign.spend,
      0,
    );
    const totalClicks = campaigns.reduce(
      (sum, campaign) => sum + campaign.clicks,
      0,
    );
    const totalImpressions = campaigns.reduce(
      (sum, campaign) => sum + campaign.impressions,
      0,
    );
    const totalConversions = campaigns.reduce(
      (sum, campaign) => sum + campaign.conversions,
      0,
    );
    const totalSessions = campaigns.reduce(
      (sum, campaign) => sum + campaign.sessions,
      0,
    );
    const weightedBounceRate =
      totalSessions > 0
        ? campaigns.reduce(
            (sum, campaign) => sum + campaign.bounceRate * campaign.sessions,
            0,
          ) / totalSessions
        : 0;

    return {
      connected: true,
      available: true,
      source: "yandex_direct_reports",
      checkedAt: new Date().toISOString(),
      period,
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      conversions: totalConversions,
      conversionRate:
        totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      costPerConversion:
        totalConversions > 0 ? totalSpend / totalConversions : 0,
      sessions: totalSessions,
      bounceRate: weightedBounceRate,
      campaigns: campaigns
        .map((campaign) => ({
          ...campaign,
          avgCpc:
            campaign.avgCpc ||
            (campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0),
          costPerConversion:
            campaign.costPerConversion ||
            (campaign.conversions > 0
              ? campaign.spend / campaign.conversions
              : 0),
          conversionRate:
            campaign.conversionRate ||
            (campaign.clicks > 0
              ? (campaign.conversions / campaign.clicks) * 100
              : 0),
          ctr:
            campaign.ctr ||
            (campaign.impressions > 0
              ? (campaign.clicks / campaign.impressions) * 100
              : 0),
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 8),
      error: null,
    };
  } catch (error) {
    return empty(
      true,
      error instanceof Error
        ? error.message
        : "Не удалось получить расход Direct",
    );
  }
}

function emptyStatus(
  mode: YandexDirectStatus["mode"],
  error: string | null = null,
): YandexDirectStatus {
  return {
    configured: mode !== "missing",
    connected: false,
    mode,
    checkedAt: new Date().toISOString(),
    campaignsCount: 0,
    campaigns: [],
    error,
  };
}

export async function getYandexDirectStatus(
  settings?: DirectSettings,
): Promise<YandexDirectStatus> {
  const token = getDirectToken(settings);
  const hasOauthApp = Boolean(
    process.env.YANDEX_DIRECT_CLIENT_ID &&
    process.env.YANDEX_DIRECT_CLIENT_SECRET,
  );

  if (!token) {
    return emptyStatus(hasOauthApp ? "oauth-app" : "missing");
  }

  const body = {
    method: "get",
    params: {
      SelectionCriteria: {},
      FieldNames: ["Id", "Name", "State", "Status", "Type", "StartDate"],
    },
  };

  try {
    const data = await callYandexDirect<{
      result?: { Campaigns?: DirectCampaign[] };
    }>("campaigns", body, { settings });

    const campaigns = ((data?.result?.Campaigns || []) as DirectCampaign[]).map(
      (campaign) => ({
        id: Number(campaign.Id || 0),
        name: campaign.Name || "Кампания без названия",
        state: campaign.State || "UNKNOWN",
        status: campaign.Status || "UNKNOWN",
        type: campaign.Type || "UNKNOWN",
        startDate: campaign.StartDate || null,
      }),
    );

    return {
      configured: true,
      connected: true,
      mode: "oauth-token",
      checkedAt: new Date().toISOString(),
      campaignsCount: campaigns.length,
      campaigns: campaigns.slice(0, 5),
      error: null,
    };
  } catch (error) {
    return {
      ...emptyStatus(
        "oauth-token",
        error instanceof Error ? error.message : "Yandex Direct API недоступен",
      ),
      checkedAt: new Date().toISOString(),
    };
  }
}
