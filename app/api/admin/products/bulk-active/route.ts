export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRODUCTS_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

async function checkAccess() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return {
    allowed: !!(session && role && PRODUCTS_ROLES.includes(role)),
    userId: (session?.user as { id?: string } | undefined)?.id,
    email: session?.user?.email,
    role,
  };
}

// POST /api/admin/products/bulk-active
// Body: { productIds: string[], active: boolean, featured?: boolean }
// Atomic mass toggle of active/featured flags (replaces N parallel PATCH requests)
export async function POST(req: Request) {
  const access = await checkAccess();
  if (!access.allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { productIds?: unknown; active?: unknown; featured?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const productIds = Array.isArray(body.productIds) ? body.productIds.filter((x): x is string => typeof x === "string") : [];
  if (!productIds.length) {
    return NextResponse.json({ error: "productIds (массив) обязателен" }, { status: 400 });
  }
  if (productIds.length > 1000) {
    return NextResponse.json({ error: "Максимум 1000 товаров за раз" }, { status: 400 });
  }

  const data: { active?: boolean; featured?: boolean } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.featured === "boolean") data.featured = body.featured;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Укажите active и/или featured (boolean)" }, { status: 400 });
  }

  try {
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data,
    });

    // Audit log
    if (access.userId) {
      try {
        await prisma.activityLog.create({
          data: {
            userId: access.userId,
            action: "BULK_PRODUCT_FLAGS",
            meta: {
              ...data,
              count: result.count,
              productIds: productIds.length <= 50 ? productIds : `${productIds.length} products`,
              role: access.role,
              email: access.email,
            },
          },
        });
      } catch (e) {
        console.warn("[bulk-active] audit log failed:", e);
      }
    }

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (err: unknown) {
    console.error("[bulk-active] error:", err);
    const msg = err instanceof Error ? err.message : "Ошибка массового обновления";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
