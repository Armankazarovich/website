export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getYandexDirectStatus } from "@/lib/yandex-direct";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { mergeTenantSettings } from "@/lib/tenant-settings";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const tenantId = getCurrentTenantId();
  const [settingsRows, tenant] = await Promise.all([
    prisma.siteSettings.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { slug: tenantId } }).catch(() => null),
  ]);
  const settings = mergeTenantSettings(tenant, settingsRows);

  return NextResponse.json(await getYandexDirectStatus(settings), {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}
