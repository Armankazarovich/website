export const dynamic = "force-dynamic";

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  getGoogleUnifiedOAuthApp,
  GOOGLE_GROWTH_OAUTH_SCOPES,
  googleUnifiedOAuthRedirectUri,
} from "@/lib/google-oauth-app";

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

  const app = getGoogleUnifiedOAuthApp();
  if (!app) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Для единого входа Google нужны GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET или GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.",
      },
      { status: 400 },
    );
  }

  const tenantId = getCurrentTenantId();
  const state = `${tenantId}:google:${randomBytes(18).toString("hex")}`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", app.clientId);
  url.searchParams.set("redirect_uri", googleUnifiedOAuthRedirectUri(req));
  url.searchParams.set("scope", GOOGLE_GROWTH_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(url);
  response.cookies.set("aray_google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
