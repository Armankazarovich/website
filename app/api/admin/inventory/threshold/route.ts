export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";

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
      where: { id: { in: ids } },
      data: { lowStockThreshold: thresholdInt },
    });
    return NextResponse.json({ ok: true, updated: res.count, threshold: thresholdInt });
  }

  // Одиночное обновление
  const variantId = body?.variantId;
  if (typeof variantId !== "string" || !variantId) {
    return NextResponse.json({ ok: false, error: "variantId обязателен" }, { status: 400 });
  }

  try {
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { lowStockThreshold: thresholdInt },
      select: { id: true, lowStockThreshold: true },
    });
    return NextResponse.json({ ok: true, variantId: variant.id, threshold: variant.lowStockThreshold });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Вариант не найден" },
      { status: 404 }
    );
  }
}
