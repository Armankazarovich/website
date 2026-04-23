export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { generateProductDescription } from "@/lib/product-seo";

const PRODUCTS_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

async function checkProductsAccess() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && role && PRODUCTS_ROLES.includes(role);
}

export async function GET() {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { name, slug, description, categoryId, images, saleUnit, active, featured } = body as {
    name?: string;
    slug?: string;
    description?: string;
    categoryId?: string;
    images?: unknown;
    saleUnit?: string;
    active?: boolean;
    featured?: boolean;
  };

  // ── Валидация ────────────────────────────────────────────────────────────
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Название товара обязательно" }, { status: 400 });
  }
  if (name.trim().length > 200) {
    return NextResponse.json({ error: "Название не должно превышать 200 символов" }, { status: 400 });
  }
  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ error: "Slug обязателен" }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug может содержать только латиницу (a-z), цифры и дефис" },
      { status: 400 }
    );
  }
  if (slug.length > 120) {
    return NextResponse.json({ error: "Slug не должен превышать 120 символов" }, { status: 400 });
  }
  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json({ error: "Выберите категорию" }, { status: 400 });
  }
  if (saleUnit !== undefined && !["CUBE", "PIECE", "BOTH"].includes(saleUnit)) {
    return NextResponse.json(
      { error: "saleUnit должен быть CUBE, PIECE или BOTH" },
      { status: 400 }
    );
  }
  if (images !== undefined && !Array.isArray(images)) {
    return NextResponse.json({ error: "images должно быть массивом URL" }, { status: 400 });
  }

  // Проверка существования категории
  const categoryExists = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
  if (!categoryExists) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
  }

  // Авто-шаблонное описание, если менеджер не заполнил поле
  let finalDescription = description;
  const isEmptyDesc = !description || !String(description).trim() || String(description).trim().length < 40;
  if (isEmptyDesc) {
    try {
      const settings = await getSiteSettings();
      finalDescription = generateProductDescription(
        {
          name: name.trim(),
          description: description ?? null,
          category: { name: categoryExists.name },
          variants: [], // при создании вариантов ещё нет
        },
        settings
      );
    } catch (err) {
      console.warn("[products:create] auto-description failed", err);
      finalDescription = description;
    }
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        description: finalDescription,
        categoryId,
        images: Array.isArray(images) ? (images as string[]) : [],
        saleUnit: (saleUnit ?? "BOTH") as never,
        active: active ?? true,
        featured: featured ?? false,
      },
      include: { category: true, variants: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Товар с таким slug уже существует. Выберите другой slug." },
        { status: 409 }
      );
    }
    if (code === "P2003") {
      return NextResponse.json(
        { error: "Категория не существует или удалена" },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Ошибка создания товара";
    console.error("[products:create] error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
