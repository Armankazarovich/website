import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type DirectCampaign = {
  Id?: number;
  Name?: string;
  State?: string;
  Status?: string;
  Type?: string;
  StartDate?: string;
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

function getDirectToken() {
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
      const oauthLine = text.match(/^\s*([A-Za-z0-9._~+-]+)\s*-\s*oauth\s+token/im);
      if (oauthLine?.[1]) return oauthLine[1].trim();
      const tokenConst = text.match(/const\s+TOKEN\s*=\s*['"`]([^'"`]+)['"`]/);
      if (tokenConst?.[1]) return tokenConst[1].trim();
    } catch {
      // Local developer fallback only; production must use environment variables.
    }
  }

  return "";
}

function getDirectApiBase() {
  return (process.env.YANDEX_DIRECT_API_URL || "https://api.direct.yandex.com/json/v5/")
    .trim()
    .replace(/\/?$/, "/");
}

function emptyStatus(mode: YandexDirectStatus["mode"], error: string | null = null): YandexDirectStatus {
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

export async function getYandexDirectStatus(): Promise<YandexDirectStatus> {
  const token = getDirectToken();
  const hasOauthApp = Boolean(process.env.YANDEX_DIRECT_CLIENT_ID && process.env.YANDEX_DIRECT_CLIENT_SECRET);

  if (!token) {
    return emptyStatus(hasOauthApp ? "oauth-app" : "missing");
  }

  const body = JSON.stringify({
    method: "get",
    params: {
      SelectionCriteria: {},
      FieldNames: ["Id", "Name", "State", "Status", "Type", "StartDate"],
    },
  });

  try {
    const res = await fetch(`${getDirectApiBase()}campaigns`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Language": "ru",
        "Content-Type": "application/json; charset=utf-8",
      },
      body,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || data?.error) {
      return {
        ...emptyStatus("oauth-token", data?.error?.error_detail || data?.error?.message || "Yandex Direct API не ответил"),
        checkedAt: new Date().toISOString(),
      };
    }

    const campaigns = ((data?.result?.Campaigns || []) as DirectCampaign[]).map((campaign) => ({
      id: Number(campaign.Id || 0),
      name: campaign.Name || "Кампания без названия",
      state: campaign.State || "UNKNOWN",
      status: campaign.Status || "UNKNOWN",
      type: campaign.Type || "UNKNOWN",
      startDate: campaign.StartDate || null,
    }));

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
      ...emptyStatus("oauth-token", error instanceof Error ? error.message : "Yandex Direct API недоступен"),
      checkedAt: new Date().toISOString(),
    };
  }
}
