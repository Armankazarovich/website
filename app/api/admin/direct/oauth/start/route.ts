export const dynamic = "force-dynamic";

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCurrentTenantId } from "@/lib/tenant-context";

function oauthRedirectUri(req: Request) {
  const requestUrl = new URL(req.url);
  return (
    process.env.YANDEX_DIRECT_REDIRECT_URI ||
    `${requestUrl.protocol}//${requestUrl.host}/api/admin/direct/oauth/callback`
  );
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const clientId = process.env.YANDEX_DIRECT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "YANDEX_DIRECT_CLIENT_ID не настроен для OAuth-подключения Direct" },
      { status: 400 },
    );
  }

  const tenantId = getCurrentTenantId();
  const state = `${tenantId}:${randomBytes(18).toString("hex")}`;
  const url = new URL("https://oauth.yandex.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", oauthRedirectUri(req));
  url.searchParams.set("state", state);
  url.searchParams.set("force_confirm", "yes");

  const response = NextResponse.redirect(url);
  response.cookies.set("aray_direct_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
