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

// POST /api/admin/products/bulk-category
// Body: { productIds: string[], categoryId: string }
// Mass move products to a new category. Verifies category exists.
export async function POST(req: Request) {
  const access = await checkAccess();
  if (!access.allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { productIds?: unknown; categoryId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const productIds = Array.isArray(body.productIds) ? body.productIds.filter((x): x is string => typeof x === "string") : [];
  const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
  if (!productIds.length) {
    return NextResponse.json({ error: "productIds (массив) обязателен" }, { status: 400 });
  }
  if (productIds.length > 1000) {
    return NextResponse.json({ error: "Максимум 1000 товаров за раз" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId обязателен" }, { status: 400 });
  }

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
  if (!category) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  try {
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { categoryId },
    });

    // Audit log
    if (access.userId) {
      try {
        await prisma.activityLog.create({
          data: {
            userId: access.userId,
            action: "BULK_PRODUCT_CATEGORY",
            meta: {
              categoryId,
              categoryName: category.name,
              count: result.count,
              productIds: productIds.length <= 50 ? productIds : `${productIds.length} products`,
              role: access.role,
              email: access.email,
            },
          },
        });
      } catch (e) {
        console.warn("[bulk-category] audit log failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      updated: result.count,
      categoryName: category.name,
    });
  } catch (err: unknown) {
    console.error("[bulk-category] error:", err);
    const code = (err as { code?: string })?.code;
    if (code === "P2003") {
      return NextResponse.json({ error: "Категория не существует" }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Ошибка перемещения товаров";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
