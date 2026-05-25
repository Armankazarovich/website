export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { encryptSettingValue } from "@/lib/secure-settings";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { yandexOAuthCallbackUri } from "@/lib/yandex-oauth-redirect";

type YandexTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function oauthRedirectUri(req: Request) {
  return yandexOAuthCallbackUri(
    req,
    "YANDEX_METRIKA_REDIRECT_URI",
    "/api/admin/metrika/oauth/callback",
  );
}

function adminReturnUrl(req: Request, path: string) {
  return new URL(path, new URL(oauthRedirectUri(req)).origin);
}

function metrikaOAuthApp() {
  const clientId = (
    process.env.YANDEX_METRIKA_CLIENT_ID ||
    process.env.YANDEX_OAUTH_CLIENT_ID ||
    process.env.YANDEX_LOGIN_CLIENT_ID ||
    ""
  ).trim();
  const clientSecret = (
    process.env.YANDEX_METRIKA_CLIENT_SECRET ||
    process.env.YANDEX_OAUTH_CLIENT_SECRET ||
    process.env.YANDEX_LOGIN_CLIENT_SECRET ||
    ""
  ).trim();

  return { clientId, clientSecret };
}

async function exchangeCode(req: Request, code: string) {
  const { clientId, clientSecret } = metrikaOAuthApp();
  if (!clientId || !clientSecret) {
    throw new Error("YANDEX_METRIKA_CLIENT_ID / YANDEX_METRIKA_CLIENT_SECRET не настроены");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("redirect_uri", oauthRedirectUri(req));

  const response = await fetch("https://oauth.yandex.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as YandexTokenResponse;
  if (!response.ok || payload.error || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Яндекс не вернул OAuth token Метрики");
  }

  return payload;
}

async function saveSetting(key: string, value: string, tenantId: string) {
  await prisma.siteSettings.upsert({
    where: { key },
    create: { id: key, key, value, tenantId },
    update: { value, tenantId },
  });
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const expectedState = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)aray_metrika_oauth_state=([^;]+)/)?.[1];
  const tenantId = getCurrentTenantId();

  try {
    if (!code) throw new Error("Яндекс не вернул код подключения Метрики");
    if (!state || !expectedState || decodeURIComponent(expectedState) !== state) {
      throw new Error("OAuth state не совпал, подключение Метрики остановлено");
    }
    if (!state.startsWith(`${tenantId}:`)) {
      throw new Error("OAuth state не совпадает с текущим бизнесом");
    }

    const token = await exchangeCode(req, code);
    await saveSetting(
      "yandex_metrika_oauth_token",
      encryptSettingValue(token.access_token || ""),
      tenantId,
    );
    if (token.refresh_token) {
      await saveSetting(
        "yandex_metrika_refresh_token",
        encryptSettingValue(token.refresh_token),
        tenantId,
      );
    }
    if (token.expires_in) {
      await saveSetting("yandex_metrika_token_expires_in", String(token.expires_in), tenantId);
    }
    await saveSetting("yandex_metrika_connected_at", new Date().toISOString(), tenantId);

    const response = NextResponse.redirect(adminReturnUrl(req, "/admin/promotion?metrika=connected"));
    response.cookies.set("aray_metrika_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      adminReturnUrl(
        req,
        `/admin/promotion?metrika=error&message=${encodeURIComponent(
          error instanceof Error ? error.message : "Metrika OAuth error",
        )}`,
      ),
    );
    response.cookies.set("aray_metrika_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  }
}
