export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { buildYandexDirectDraft, normalizeDirectDraftOptions } from "@/lib/direct-campaign-draft";
import { getYandexDirectStatus } from "@/lib/yandex-direct";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function readDraftOptions(req: Request) {
  const requestUrl = new URL(req.url);
  const fromQuery = Object.fromEntries(requestUrl.searchParams.entries());

  if (req.method !== "POST") {
    return normalizeDirectDraftOptions(fromQuery);
  }

  const body = await req.json().catch(() => ({}));
  return normalizeDirectDraftOptions({
    ...fromQuery,
    ...((body?.options || body) as Record<string, unknown>),
  });
}

async function buildDraftPayload(req: Request) {
  const options = await readDraftOptions(req);
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
  const direct = await getYandexDirectStatus(settings);
  const requestUrl = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    `${requestUrl.protocol}//${requestUrl.host}`;

  return {
    ok: true,
    mode: "draft-only",
    direct,
    draft: buildYandexDirectDraft({
      products,
      settings,
      baseUrl,
      tenant,
      options,
    }),
    safety: "ARAY готовит структуру и тексты. Создание/запуск платной рекламы требует отдельного подтверждения владельца.",
  };
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(await buildDraftPayload(req), {
    headers: {
      "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(await buildDraftPayload(req));
}
