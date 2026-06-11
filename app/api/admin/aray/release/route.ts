export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getArayReleaseControl } from "@/lib/aray-release-control";

async function ensureAccess() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "constructor.store-builder",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess;

  return auth;
}

export async function GET() {
  const auth = await ensureAccess();
  if (!auth.authorized) return auth.response;

  return NextResponse.json({
    ok: true,
    release: getArayReleaseControl(),
  });
}
