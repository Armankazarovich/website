export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { buildYandexDirectDraft } from "@/lib/direct-campaign-draft";
import { exportYandexDirectDraft } from "@/lib/yandex-direct-export";
import { getYandexDirectStatus } from "@/lib/yandex-direct";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function buildTenantDraft(req: Request) {
  const tenantId = getCurrentTenantId();
  const [products, settingsRows, tenant] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, active: true },
      include: { category: true, variants: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    prisma.siteSettings.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { slug: tenantId } }).catch(() => null),
  ]);
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const requestUrl = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    `${requestUrl.protocol}//${requestUrl.host}`;

  return {
    tenantId,
    settings,
    draft: buildYandexDirectDraft({
      products,
      settings,
      baseUrl,
      tenant,
    }),
  };
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { tenantId, settings, draft } = await buildTenantDraft(req);
    const direct = await getYandexDirectStatus(settings);
    if (!direct.connected) {
      return NextResponse.json(
        {
          ok: false,
          error: direct.error || "Yandex Direct API не подключен для текущего бизнеса",
        },
        { status: 400 },
      );
    }

    const result = await exportYandexDirectDraft({ draft, settings });

    return NextResponse.json(
      {
        ok: true,
        tenantId,
        mode: "created-in-direct-not-launched",
        export: result,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Не удалось выгрузить кампанию в Direct",
      },
      { status: 500 },
    );
  }
}
