export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import {
  buildYandexGrowthConnectorOverview,
  runYandexGrowthConnectorAction,
} from "@/lib/yandex-growth-connector";

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

  return NextResponse.json(await buildYandexGrowthConnectorOverview(req), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const auth = await authorize();
  if (!auth.authorized) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await runYandexGrowthConnectorAction(req, body);
    return NextResponse.json({
      ...result,
      overview: await buildYandexGrowthConnectorOverview(req),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Yandex connector action failed",
      },
      { status: 400 },
    );
  }
}
