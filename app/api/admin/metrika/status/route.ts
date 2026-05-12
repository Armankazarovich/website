export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getYandexMetrikaStatus } from "@/lib/yandex-metrika";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const tenantId = getCurrentTenantId();
  const settingsRows = await prisma.siteSettings.findMany({ where: { tenantId } });
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));

  return NextResponse.json(await getYandexMetrikaStatus(settings), {
    headers: { "Cache-Control": "no-store" },
  });
}
