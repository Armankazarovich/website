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
    "direct_oauth_token",
    "direct_access_token",
  ]);
  if (settingsToken) return decryptSettingValue(settingsToken);

  const envToken = (
    process.env.YANDEX_DIRECT_OAUTH_TOKEN ||
    process.env.YANDEX_DIRECT_ACCESS_TOKEN ||
    process.env.YANDEX_DIRECT_TOKEN ||
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

function getDirectClientLogin(settings?: DirectSettings) {
  return settingValue(settings, [
    "yandex_direct_client_login",
    "direct_client_login",
  ]);
}

function responseSnippet(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function directErrorMessage(data: DirectErrorPayload | null, fallback: string) {
  return data?.error?.error_detail || data?.error?.message || fallback;
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
