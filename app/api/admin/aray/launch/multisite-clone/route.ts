export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { createArayMultisiteClone } from "@/lib/aray-multisite-clone";
import { getCurrentTenantId } from "@/lib/tenant-context";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanString(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "constructor.store-builder",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const body = asRecord(await req.json().catch(() => null));
  const sourceTenantId = getCurrentTenantId();
  const siteName = cleanString(body.siteName || body.name || body.storeName, 160);
  const brief = cleanString(body.brief || body.notes, 2200);
  const domain = cleanString(body.domain, 240);

  if (body.confirm !== true) {
    return NextResponse.json({
      ok: false,
      error: "Подтвердите создание нового сайта",
    }, { status: 400 });
  }

  if (!siteName && !domain && !brief) {
    return NextResponse.json({
      ok: false,
      error: "Напишите название сайта, домен или короткий Brief",
    }, { status: 400 });
  }

  try {
    const result = await createArayMultisiteClone({
      siteName: siteName || domain || "Новый сайт ARAY",
      domain,
      targetSlug: cleanString(body.targetSlug || body.tenantId, 80),
      sourceTenantId,
      businessType: cleanString(body.businessType, 80),
      city: cleanString(body.city, 120),
      brief,
      contactName: cleanString(body.contactName, 160),
      phone: cleanString(body.phone, 80),
      email: cleanString(body.email, 120),
      userId: auth.userId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось создать сайт в ARAY CMS",
    }, { status: 400 });
  }
}
