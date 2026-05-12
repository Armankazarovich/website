export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { prisma } from "@/lib/prisma";
import { encryptSettingValue } from "@/lib/secure-settings";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { runYandexGrowthConnectorAction } from "@/lib/yandex-growth-connector";
import {
  getYandexUnifiedOAuthApp,
  yandexUnifiedOAuthRedirectUri,
} from "@/lib/yandex-oauth-app";

type YandexTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

async function authorize() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth;
  const moduleAccess = await requireArayModuleAccess({
    moduleId: "core.connector-vault",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess;
  return { authorized: true as const, role: auth.role };
}

async function exchangeCode(req: Request, code: string) {
  const app = getYandexUnifiedOAuthApp();
  if (!app) {
    throw new Error("Единое OAuth-приложение Яндекса не настроено");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("client_id", app.clientId);
  body.set("client_secret", app.clientSecret);
  body.set("redirect_uri", yandexUnifiedOAuthRedirectUri(req));

  const response = await fetch("https://oauth.yandex.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as YandexTokenResponse;
  if (!response.ok || payload.error || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Яндекс не вернул единый OAuth token",
    );
  }

  return payload;
}

async function saveSetting(tenantId: string, key: string, value: string) {
  await prisma.siteSettings.upsert({
    where: { key },
    create: { id: key, key, value, tenantId },
    update: { value, tenantId },
  });
}

export async function GET(req: Request) {
  const auth = await authorize();
  if (!auth.authorized) return auth.response;

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const expectedState = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)aray_yandex_oauth_state=([^;]+)/)?.[1];
  const tenantId = getCurrentTenantId();

  const redirectWith = (params: Record<string, string>) => {
    const url = new URL("/admin/promotion", requestUrl.origin);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const response = NextResponse.redirect(url);
    response.cookies.set("aray_yandex_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  };

  try {
    if (!code) throw new Error("Яндекс не вернул код подключения");
    if (!state || !expectedState || decodeURIComponent(expectedState) !== state) {
      throw new Error("OAuth state не совпал, единое подключение Яндекса остановлено");
    }
    if (!state.startsWith(`${tenantId}:`)) {
      throw new Error("OAuth state не совпадает с текущим бизнесом");
    }

    const token = await exchangeCode(req, code);
    const encryptedAccessToken = encryptSettingValue(token.access_token || "");
    await saveSetting(tenantId, "yandex_oauth_token", encryptedAccessToken);
    await saveSetting(tenantId, "yandex_metrika_oauth_token", encryptedAccessToken);
    await saveSetting(tenantId, "yandex_direct_oauth_token", encryptedAccessToken);
    if (token.refresh_token) {
      const encryptedRefreshToken = encryptSettingValue(token.refresh_token);
      await saveSetting(tenantId, "yandex_oauth_refresh_token", encryptedRefreshToken);
      await saveSetting(tenantId, "yandex_metrika_refresh_token", encryptedRefreshToken);
      await saveSetting(tenantId, "yandex_direct_refresh_token", encryptedRefreshToken);
    }
    if (token.expires_in) {
      await saveSetting(tenantId, "yandex_oauth_token_expires_in", String(token.expires_in));
    }
    await saveSetting(tenantId, "yandex_oauth_connected_at", new Date().toISOString());

    const prepare = await runYandexGrowthConnectorAction(req, { action: "auto_prepare" });
    return redirectWith({
      yandex: "connected",
      prepare: prepare.ok ? "ready" : "needs-action",
      message: prepare.message || "Яндекс подключен",
    });
  } catch (error) {
    return redirectWith({
      yandex: "error",
      message: error instanceof Error ? error.message : "Yandex OAuth error",
    });
  }
}
