import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

/**
 * POST /api/admin/products/audit-actions
 *
 * Bulk actions для аудита каталога:
 *  - hide-variants       → variants.inStock = false (скрывает вариант с сайта, не удаляет)
 *  - show-variants       → variants.inStock = true (вернуть скрытые)
 *  - deactivate-products → products.active = false (скрывает товар целиком)
 *  - activate-products   → products.active = true (вернуть скрытые)
 *
 * Body: { action: string, ids: string[] }
 * Response: { ok: true, updated: number } | { ok: false, error: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.role as string | undefined;
    if (!session?.user || !role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ ok: false, error: "Доступ запрещён" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Неверный формат запроса" }, { status: 400 });
    }

    const { action, ids } = body as { action?: string; ids?: unknown };
    if (!action || typeof action !== "string") {
      return NextResponse.json({ ok: false, error: "action обязателен" }, { status: 400 });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ids должен быть непустым массивом" }, { status: 400 });
    }
    const idList = ids.filter((x): x is string => typeof x === "string" && x.length > 0);
    if (idList.length === 0) {
      return NextResponse.json({ ok: false, error: "Нет валидных id" }, { status: 400 });
    }

    let updated = 0;

    switch (action) {
      case "hide-variants": {
        const res = await prisma.productVariant.updateMany({
          where: { id: { in: idList } },
          data: { inStock: false },
        });
        updated = res.count;
        break;
      }
      case "show-variants": {
        const res = await prisma.productVariant.updateMany({
          where: { id: { in: idList } },
          data: { inStock: true },
        });
        updated = res.count;
        break;
      }
      case "deactivate-products": {
        const res = await prisma.product.updateMany({
          where: { id: { in: idList } },
          data: { active: false },
        });
        updated = res.count;
        break;
      }
      case "activate-products": {
        const res = await prisma.product.updateMany({
          where: { id: { in: idList } },
          data: { active: true },
        });
        updated = res.count;
        break;
      }
      default:
        return NextResponse.json({ ok: false, error: `Неизвестное действие: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error("[audit-actions] error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Внутренняя ошибка" },
      { status: 500 }
    );
  }
}
