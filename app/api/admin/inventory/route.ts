export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INVENTORY_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];

async function checkAccess() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return {
    allowed: !!(session && role && INVENTORY_ROLES.includes(role)),
    userId: (session?.user as { id?: string } | undefined)?.id,
    role,
  };
}

// PATCH — update stockQty (and auto-update inStock) + prices
// Roles: SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE
export async function PATCH(req: Request) {
  const access = await checkAccess();
  if (!access.allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { variantId, stockQty, pricePerCube, pricePerPiece, inStock, lowStockThreshold } = body as {
    variantId?: string;
    stockQty?: number | null;
    pricePerCube?: number | string | null;
    pricePerPiece?: number | string | null;
    inStock?: boolean;
    lowStockThreshold?: number;
  };

  if (!variantId) return NextResponse.json({ error: "variantId обязателен" }, { status: 400 });

  // WAREHOUSE can only change stock, not prices (business rule)
  const canEditPrices = access.role === "SUPER_ADMIN" || access.role === "ADMIN" || access.role === "MANAGER";
  if (!canEditPrices && (pricePerCube !== undefined || pricePerPiece !== undefined)) {
    return NextResponse.json(
      { error: "Изменение цен доступно только администраторам и менеджерам" },
      { status: 403 }
    );
  }

  const updateData: Record<string, unknown> = {};

  // Stock quantity
  if (stockQty !== undefined) {
    if (stockQty !== null) {
      const qty = Number(stockQty);
      if (isNaN(qty) || qty < 0) {
        return NextResponse.json({ error: "stockQty должен быть ≥ 0" }, { status: 400 });
      }
      updateData.stockQty = qty;
      updateData.inStock = qty > 0;
    } else {
      // null = not tracked, don't change inStock
      updateData.stockQty = null;
    }
  }

  // Prices (admin/manager only — checked above)
  if (pricePerCube !== undefined) {
    if (pricePerCube === "" || pricePerCube === null) {
      updateData.pricePerCube = null;
    } else {
      const n = Number(pricePerCube);
      if (isNaN(n) || n < 0) {
        return NextResponse.json({ error: "pricePerCube должен быть ≥ 0" }, { status: 400 });
      }
      updateData.pricePerCube = n;
    }
  }
  if (pricePerPiece !== undefined) {
    if (pricePerPiece === "" || pricePerPiece === null) {
      updateData.pricePerPiece = null;
    } else {
      const n = Number(pricePerPiece);
      if (isNaN(n) || n < 0) {
        return NextResponse.json({ error: "pricePerPiece должен быть ≥ 0" }, { status: 400 });
      }
      updateData.pricePerPiece = n;
    }
  }

  // Direct inStock toggle (only when stockQty not provided)
  if (inStock !== undefined && stockQty === undefined) updateData.inStock = !!inStock;

  // Low-stock threshold
  if (lowStockThreshold !== undefined) {
    const n = Number(lowStockThreshold);
    if (isNaN(n) || n < 0) {
      return NextResponse.json({ error: "lowStockThreshold должен быть ≥ 0" }, { status: 400 });
    }
    updateData.lowStockThreshold = n;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    // Audit log (non-blocking)
    if (access.userId) {
      try {
        await prisma.activityLog.create({
          data: {
            userId: access.userId,
            action: "INVENTORY_UPDATE",
            targetId: variantId,
            meta: JSON.parse(JSON.stringify({ changes: updateData, role: access.role })),
          },
        });
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      inStock: variant.inStock,
      stockQty: variant.stockQty,
      pricePerCube: variant.pricePerCube,
      pricePerPiece: variant.pricePerPiece,
      lowStockThreshold: variant.lowStockThreshold,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Вариант не найден" }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : "Ошибка обновления";
    console.error("[inventory:patch] error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
