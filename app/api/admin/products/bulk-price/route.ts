export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { revalidatePath, revalidateTag } from "next/cache";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return {
    allowed: role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER",
    userId: (session?.user as { id?: string } | undefined)?.id,
    email: session?.user?.email,
    role,
  };
}

// POST /api/admin/products/bulk-price
// Body: { productIds: string[], percent: number }
// percent: +10 = +10%, -5 = -5%
export async function POST(req: Request) {
  const access = await checkAdmin();
  if (!access.allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: { productIds?: unknown; percent?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const productIds = Array.isArray(body.productIds) ? body.productIds.filter((x): x is string => typeof x === "string") : [];
  if (!productIds.length) {
    return NextResponse.json({ error: "productIds (массив) обязателен" }, { status: 400 });
  }
  if (productIds.length > 500) {
    return NextResponse.json({ error: "Максимум 500 товаров за раз" }, { status: 400 });
  }

  const numPercent = Number(body.percent);
  if (isNaN(numPercent) || numPercent < -50 || numPercent > 200) {
    return NextResponse.json({ error: "Процент должен быть от -50% до +200%" }, { status: 400 });
  }

  const multiplier = 1 + numPercent / 100;

  // Atomic batch: fetch current + update all in one transaction
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds }, product: { tenantId } },
    select: { id: true, productId: true, size: true, pricePerCube: true, pricePerPiece: true },
  });

  if (variants.length === 0) {
    return NextResponse.json({ error: "Нет вариантов для обновления" }, { status: 404 });
  }

  const round50 = (n: number) => Math.max(0, Math.round(n / 50) * 50);

  // Pre-compute updates (skip null/zero prices)
  const updates = variants
    .map((v) => {
      const data: { pricePerCube?: number; pricePerPiece?: number } = {};
      const oldCube = v.pricePerCube ? Number(v.pricePerCube) : null;
      const oldPiece = v.pricePerPiece ? Number(v.pricePerPiece) : null;
      if (oldCube && oldCube > 0) {
        const nextCube = round50(oldCube * multiplier);
        if (nextCube !== oldCube) data.pricePerCube = nextCube;
      }
      if (oldPiece && oldPiece > 0) {
        const nextPiece = round50(oldPiece * multiplier);
        if (nextPiece !== oldPiece) data.pricePerPiece = nextPiece;
      }
      if (Object.keys(data).length === 0) return null;
      return { id: v.id, productId: v.productId, size: v.size, data, oldCube, oldPiece };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "В выбранных товарах нет цен, которые можно изменить этим процентом",
        variantsScanned: variants.length,
      },
      { status: 409 },
    );
  }

  // Atomic transaction — all or nothing
  try {
    await prisma.$transaction(updates.map((u) =>
      prisma.productVariant.update({ where: { id: u.id }, data: u.data })
    ));

    revalidateTag("store-shell-data");
    revalidatePath("/catalog");
    revalidatePath("/admin/products");

    // Audit log (non-blocking, don't fail request if log fails)
    if (access.userId) {
      try {
        await prisma.activityLog.create({
          data: {
            userId: access.userId,
            action: "BULK_PRICE_UPDATE",
            meta: {
              percent: numPercent,
              productIds: productIds.length <= 50 ? productIds : `${productIds.length} products`,
              variantsUpdated: updates.length,
              role: access.role,
              email: access.email,
            },
          },
        });
      } catch (e) {
        console.warn("[bulk-price] audit log failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      updated: updates.length,
      percent: numPercent,
      productsAffected: new Set(updates.map((update) => update.productId)).size,
      variantsScanned: variants.length,
    });
  } catch (err: unknown) {
    console.error("[bulk-price] transaction failed:", err);
    const msg = err instanceof Error ? err.message : "Ошибка обновления цен";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
