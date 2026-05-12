export const dynamic = "force-dynamic";

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  getYandexUnifiedOAuthApp,
  YANDEX_GROWTH_OAUTH_SCOPES,
  yandexUnifiedOAuthRedirectUri,
} from "@/lib/yandex-oauth-app";

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

export async function GET(req: Request) {
  const auth = await authorize();
  if (!auth.authorized) return auth.response;

  const app = getYandexUnifiedOAuthApp();
  if (!app) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Для единого входа нужны YANDEX_OAUTH_CLIENT_ID / YANDEX_OAUTH_CLIENT_SECRET или общий OAuth-app для Direct и Метрики.",
      },
      { status: 400 },
    );
  }

  const tenantId = getCurrentTenantId();
  const state = `${tenantId}:yandex:${randomBytes(18).toString("hex")}`;
  const url = new URL("https://oauth.yandex.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", app.clientId);
  url.searchParams.set("redirect_uri", yandexUnifiedOAuthRedirectUri(req));
  url.searchParams.set("scope", YANDEX_GROWTH_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("force_confirm", "yes");

  const response = NextResponse.redirect(url);
  response.cookies.set("aray_yandex_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
