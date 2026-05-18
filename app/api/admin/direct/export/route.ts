export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  buildYandexDirectDraft,
  normalizeDirectDraftOptions,
  type DirectDraftOptions,
} from "@/lib/direct-campaign-draft";
import {
  exportYandexDirectDraft,
  type YandexDirectExportParts,
} from "@/lib/yandex-direct-export";
import { getYandexDirectStatus } from "@/lib/yandex-direct";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { resolveDirectPublicBaseUrl } from "@/lib/direct-public-url";
import { mergeTenantSettings } from "@/lib/tenant-settings";

async function readExportRequest(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawParts = (body?.parts || {}) as Record<string, unknown>;
  return {
    confirmed: body?.confirm === true,
    options: normalizeDirectDraftOptions(
      (body?.options || body) as Record<string, unknown>,
    ),
    parts: {
      ads: rawParts.ads !== false,
      keywords: rawParts.keywords !== false,
      sitelinks: rawParts.sitelinks !== false,
      callouts: rawParts.callouts !== false,
    } satisfies YandexDirectExportParts,
  };
}

async function buildTenantDraft(req: Request, options: DirectDraftOptions) {
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
  const settings = mergeTenantSettings(tenant, settingsRows);
  const requestUrl = new URL(req.url);
  const { baseUrl, isPublic } = resolveDirectPublicBaseUrl({
    settings,
    tenant,
    requestUrl,
  });

  if (!isPublic) {
    throw new Error(
      "Для выгрузки в Direct нужен публичный домен сайта. Укажи домен бизнеса в tenant.domain или настройке site_url/direct_public_url.",
    );
  }

  return {
    tenantId,
    settings,
    draft: buildYandexDirectDraft({
      products,
      settings,
      baseUrl,
      tenant,
      options,
    }),
  };
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { confirmed, options, parts } = await readExportRequest(req);
    if (!confirmed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Нужно подтвердить выгрузку. ARAY не отправляет рекламу в Direct без явного согласия.",
        },
        { status: 400 },
      );
    }
    const { tenantId, settings, draft } = await buildTenantDraft(req, options);
    const direct = await getYandexDirectStatus(settings);
    if (!direct.connected) {
      return NextResponse.json(
        {
          ok: false,
          error:
            direct.error ||
            "Yandex Direct API не подключен для текущего бизнеса",
        },
        { status: 400 },
      );
    }

    const result = await exportYandexDirectDraft({
      draft,
      settings,
      options,
      parts,
    });

    return NextResponse.json({
      ok: true,
      tenantId,
      mode: "created-in-direct-not-launched",
      export: result,
    });
  } catch (error) {
    console.error("[direct/export] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось выгрузить кампанию в Direct",
      },
      { status: 500 },
    );
  }
}
