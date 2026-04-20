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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true, variants: { orderBy: { size: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, slug, description, categoryId, images, saleUnit, active, featured, variants } = body;

  // Авто-описание: если менеджер явно очистил / оставил слишком короткое описание —
  // подставляем шаблон из полей товара (город, размеры, цена, доставка из settings)
  let finalDescription = description;
  const descProvided = description !== undefined;
  const descTooShort = descProvided && (!description || String(description).trim().length < 40);
  if (descTooShort) {
    try {
      const [current, settings] = await Promise.all([
        prisma.product.findUnique({
          where: { id: params.id },
          include: {
            category: { select: { name: true } },
            variants: {
              select: {
                size: true,
                pricePerCube: true,
                pricePerPiece: true,
                inStock: true,
              },
            },
          },
        }),
        getSiteSettings(),
      ]);
      if (current) {
        const effectiveCategory = categoryId
          ? await prisma.category.findUnique({
              where: { id: categoryId },
              select: { name: true },
            })
          : current.category;
        const effectiveVariants = Array.isArray(variants) && variants.length > 0
          ? variants.map((v: any) => ({
              size: v.size,
              pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
              pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
              inStock: v.inStock ?? true,
            }))
          : current.variants.map((v) => ({
              size: v.size,
              pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
              pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
              inStock: v.inStock,
            }));
        finalDescription = generateProductDescription(
          {
            name: name !== undefined ? name : current.name,
            description: null,
            category: effectiveCategory ? { name: effectiveCategory.name } : null,
            variants: effectiveVariants,
          },
          settings
        );
      }
    } catch (err) {
      console.warn(`[products:patch] auto-description failed for ${params.id}`, err);
      finalDescription = description;
    }
  }

  // Update product
  await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(descProvided && { description: finalDescription }),
      ...(categoryId !== undefined && { categoryId }),
      ...(images !== undefined && { images }),
      ...(saleUnit !== undefined && { saleUnit }),
      ...(active !== undefined && { active }),
      ...(featured !== undefined && { featured }),
    },
  });

  // Update variants if provided
  if (variants !== undefined) {
    const existingVariants = await prisma.productVariant.findMany({
      where: { productId: params.id },
      select: { id: true },
    });
    const existingIds = new Set(existingVariants.map((v: { id: string }) => v.id));
    const incomingIds = new Set(variants.filter((v: any) => v.id).map((v: any) => v.id));

    // Delete removed variants
    for (const id of Array.from(existingIds)) {
      if (!incomingIds.has(id)) {
        await prisma.productVariant.delete({ where: { id } }).catch(() => {});
      }
    }

    // Upsert each variant
    for (const v of variants) {
      if (v.id && existingIds.has(v.id)) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: {
            size: v.size,
            pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
            pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
            piecesPerCube: v.piecesPerCube ? Number(v.piecesPerCube) : null,
            inStock: v.inStock ?? true,
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: params.id,
            size: v.size,
            pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
            pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
            piecesPerCube: v.piecesPerCube ? Number(v.piecesPerCube) : null,
            inStock: v.inStock ?? true,
          },
        });
      }
    }
  }

  const updated = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true, variants: { orderBy: { size: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
