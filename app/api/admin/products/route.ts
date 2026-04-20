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
  const body = await req.json();
  const { name, slug, description, categoryId, images, saleUnit, active, featured } = body;

  // Авто-шаблонное описание, если менеджер не заполнил поле
  let finalDescription = description;
  const isEmptyDesc = !description || !String(description).trim() || String(description).trim().length < 40;
  if (isEmptyDesc) {
    try {
      const settings = await getSiteSettings();
      const category = categoryId
        ? await prisma.category.findUnique({
            where: { id: categoryId },
            select: { name: true },
          })
        : null;
      finalDescription = generateProductDescription(
        {
          name: name || "",
          description: description ?? null,
          category: category ? { name: category.name } : null,
          variants: [], // при создании вариантов ещё нет — шаблон без цен
        },
        settings
      );
    } catch (err) {
      // Если авто-генерация упала — сохраняем как пришло (не блокируем создание)
      console.warn("[products:create] auto-description failed", err);
      finalDescription = description;
    }
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description: finalDescription,
      categoryId,
      images: images || [],
      saleUnit: saleUnit || "BOTH",
      active: active ?? true,
      featured: featured ?? false,
    },
    include: { category: true, variants: true },
  });
  return NextResponse.json(product);
}
