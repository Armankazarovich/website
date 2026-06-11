export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { syncLowStockAlerts } from "@/lib/inventory-alerts";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * PATCH /api/admin/inventory/threshold
 *
 * Обновляет порог предупреждения об остатках (lowStockThreshold).
 * Body:
 *   { variantId: string, threshold: number }           — одиночный вариант
 *   { variantIds: string[], threshold: number }        — массовое обновление
 *
 * Threshold — целое число ≥ 0. Если stockQty падает ниже порога — подсветка/алерт.
 * 0 = отключено.
 */
export async function PATCH(req: NextRequest) {
  const authResult = await requireManager();
  if (!authResult.authorized) return authResult.response;
  const tenantId = getCurrentTenantId();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Неверный JSON" }, { status: 400 });
  }

  const rawThreshold = body?.threshold;
  const threshold = Number(rawThreshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100000) {
    return NextResponse.json(
      { ok: false, error: "threshold должен быть целым числом от 0 до 100000" },
      { status: 400 }
    );
  }
  const thresholdInt = Math.floor(threshold);

  // Массовое обновление
  if (Array.isArray(body?.variantIds)) {
    const ids = body.variantIds.filter((x: unknown): x is string => typeof x === "string" && x.length > 0);
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "variantIds пуст" }, { status: 400 });
    }
    const res = await prisma.productVariant.updateMany({
      where: { id: { in: ids }, product: { tenantId } },
      data: { lowStockThreshold: thresholdInt },
    });
    if (res.count === 0) {
      return NextResponse.json({ ok: false, error: "Варианты не найдены" }, { status: 404 });
    }
    revalidateTag("store-shell-data");
    revalidatePath("/catalog");
    revalidatePath("/admin/products");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/notifications");
    const alertSync = await syncLowStockAlerts(prisma, {
      tenantId,
      variantIds: ids,
      source: "admin.inventory.threshold.bulk",
      userId: authResult.userId,
    });
    return NextResponse.json({ ok: true, updated: res.count, threshold: thresholdInt, lowStockAlerts: alertSync });
  }

  // Одиночное обновление
  const variantId = body?.variantId;
  if (typeof variantId !== "string" || !variantId) {
    return NextResponse.json({ ok: false, error: "variantId обязателен" }, { status: 400 });
  }

  try {
    const result = await prisma.productVariant.updateMany({
      where: { id: variantId, product: { tenantId } },
      data: { lowStockThreshold: thresholdInt },
    });
    if (result.count === 0) {
      return NextResponse.json({ ok: false, error: "Вариант не найден" }, { status: 404 });
    }
    const variant = await prisma.productVariant.findFirstOrThrow({
      where: { id: variantId, product: { tenantId } },
      select: { id: true, lowStockThreshold: true },
    });
    revalidateTag("store-shell-data");
    revalidatePath("/catalog");
    revalidatePath("/admin/products");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/notifications");
    const alertSync = await syncLowStockAlerts(prisma, {
      tenantId,
      variantIds: [variantId],
      source: "admin.inventory.threshold",
      userId: authResult.userId,
    });
    return NextResponse.json({
      ok: true,
      variantId: variant.id,
      threshold: variant.lowStockThreshold,
      lowStockAlerts: alertSync,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Вариант не найден" },
      { status: 404 }
    );
  }
}
