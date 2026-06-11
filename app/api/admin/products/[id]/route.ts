export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { generateProductDescription } from "@/lib/product-seo";
import { makeShortProductDescription, normalizeProductText } from "@/lib/product-descriptions";
import { normalizeProductCardTags } from "@/lib/product-insights";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { revalidatePath, revalidateTag } from "next/cache";

const PRODUCTS_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

function revalidateProductPublicPaths(slug?: string | null) {
  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/product/${slug}`);
}

async function checkProductsAccess() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && role && PRODUCTS_ROLES.includes(role);
}

async function makeUniqueProductSlug(base: string, currentProductId: string, tenantId: string) {
  const cleanBase = slugify(base) || "product";
  let candidate = cleanBase;
  let suffix = 1;
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId, slug: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === currentProductId) return candidate;
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const product = await prisma.product.findFirst({
    where: {
      tenantId,
      OR: [{ id: params.id }, { slug: params.id }],
    },
    include: { category: true, variants: { orderBy: { size: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { name, slug, shortDescription, description, categoryId, images, cardTags, saleUnit, active, featured, variants } =
    body as {
      name?: string;
      slug?: string;
      shortDescription?: string;
      description?: string;
      categoryId?: string;
      images?: unknown;
      cardTags?: unknown;
      saleUnit?: string;
      active?: boolean;
      featured?: boolean;
      variants?: unknown[];
    };

  // Validate SaleUnit enum
  if (saleUnit !== undefined && !["CUBE", "PIECE", "BOTH"].includes(saleUnit)) {
    return NextResponse.json(
      { error: "saleUnit должен быть CUBE, PIECE или BOTH" },
      { status: 400 }
    );
  }
  try {

  // Авто-описание: если менеджер явно очистил / оставил слишком короткое описание —
  // подставляем шаблон из полей товара (город, размеры, цена, доставка из settings)
  const previousProduct = await prisma.product.findFirst({
    where: {
      tenantId,
      OR: [{ id: params.id }, { slug: params.id }],
    },
    select: { id: true, slug: true, name: true, description: true, shortDescription: true },
  });
  if (!previousProduct) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const productId = previousProduct.id;
  let finalDescription = description;
  const descProvided = description !== undefined;
  const descTooShort = descProvided && (!description || String(description).trim().length < 180);
  if (descTooShort) {
    try {
      const [current, settings] = await Promise.all([
        prisma.product.findFirst({
          where: {
            tenantId,
            OR: [{ id: productId }, { slug: params.id }],
          },
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
          ? await prisma.category.findFirst({
              where: { id: categoryId, tenantId },
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

  // Build update payload explicitly (Prisma-typed)
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (slug !== undefined) updateData.slug = await makeUniqueProductSlug(slug || name || previousProduct?.name || "product", productId, tenantId);
  if (descProvided) updateData.description = finalDescription;
  if (shortDescription !== undefined) {
    updateData.shortDescription =
      normalizeProductText(shortDescription) ||
      makeShortProductDescription(
        finalDescription ?? previousProduct?.description,
        name ?? previousProduct?.name
      );
  } else if (descProvided) {
    updateData.shortDescription = makeShortProductDescription(
      finalDescription ?? previousProduct?.description,
      name ?? previousProduct?.name
    );
  }
  if (categoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, tenantId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
    }
    updateData.categoryId = category.id;
  }
  if (images !== undefined) updateData.images = images as string[];
  if (cardTags !== undefined) updateData.cardTags = normalizeProductCardTags(Array.isArray(cardTags) ? (cardTags as string[]) : []);
  if (saleUnit !== undefined) updateData.saleUnit = saleUnit;
  if (active !== undefined) updateData.active = active;
  if (featured !== undefined) updateData.featured = featured;

  // Update product
  await prisma.product.update({
    where: { id: productId },
    data: updateData as never,
  });

  // Update variants if provided — ATOMIC transaction
  if (variants !== undefined) {
    // Normalize + validate each variant BEFORE hitting DB
    type InVariant = {
      id?: string;
      size?: unknown;
      pricePerCube?: unknown;
      pricePerPiece?: unknown;
      piecesPerCube?: unknown;
      inStock?: unknown;
    };
    const normalized = (variants as InVariant[]).map((v, i) => {
      const size = String(v.size ?? "")
        .trim()
        .replace(/[хx*]/gi, "×"); // unify size separator
      const pricePerCube =
        v.pricePerCube !== undefined && v.pricePerCube !== null && v.pricePerCube !== ""
          ? Number(v.pricePerCube)
          : null;
      const pricePerPiece =
        v.pricePerPiece !== undefined && v.pricePerPiece !== null && v.pricePerPiece !== ""
          ? Number(v.pricePerPiece)
          : null;
      const piecesPerCube =
        v.piecesPerCube !== undefined && v.piecesPerCube !== null && v.piecesPerCube !== ""
          ? Number(v.piecesPerCube)
          : null;
      if (!size) throw new Error(`Вариант #${i + 1}: укажите размер`);
      if (pricePerCube === null && pricePerPiece === null) {
        throw new Error(`Вариант ${size}: укажите хотя бы одну цену (за м³ или за шт)`);
      }
      if (pricePerCube !== null && (isNaN(pricePerCube) || pricePerCube < 0)) {
        throw new Error(`Вариант ${size}: цена за м³ должна быть числом ≥ 0`);
      }
      if (pricePerPiece !== null && (isNaN(pricePerPiece) || pricePerPiece < 0)) {
        throw new Error(`Вариант ${size}: цена за шт должна быть числом ≥ 0`);
      }
      if (piecesPerCube !== null && (isNaN(piecesPerCube) || piecesPerCube < 0)) {
        throw new Error(`Вариант ${size}: количество в м³ должно быть числом ≥ 0`);
      }
      return {
        id: v.id as string | undefined,
        size,
        pricePerCube,
        pricePerPiece,
        piecesPerCube,
        inStock: v.inStock === false ? false : true,
      };
    });

    // Duplicate size check
    const seenSizes = new Set<string>();
    for (const v of normalized) {
      const k = v.size.toLowerCase();
      if (seenSizes.has(k)) {
        throw new Error(`Дубликат размера "${v.size}" — размеры должны быть уникальны в товаре`);
      }
      seenSizes.add(k);
    }

    const existingVariants = await prisma.productVariant.findMany({
      where: { productId },
      select: { id: true },
    });
    const existingIds = new Set(existingVariants.map((v: { id: string }) => v.id));
    const incomingIds = new Set(normalized.filter((v) => v.id).map((v) => v.id!));

    // Atomic transaction: delete removed → upsert incoming
    await prisma.$transaction([
      // Delete variants that are not in incoming set
      ...Array.from(existingIds)
        .filter((id) => !incomingIds.has(id))
        .map((id) => prisma.productVariant.delete({ where: { id } })),
      // Upsert incoming
      ...normalized.map((v) =>
        v.id && existingIds.has(v.id)
          ? prisma.productVariant.update({
              where: { id: v.id },
              data: {
                size: v.size,
                pricePerCube: v.pricePerCube,
                pricePerPiece: v.pricePerPiece,
                piecesPerCube: v.piecesPerCube,
                inStock: v.inStock,
              },
            })
          : prisma.productVariant.create({
              data: {
                productId,
                size: v.size,
                pricePerCube: v.pricePerCube,
                pricePerPiece: v.pricePerPiece,
                piecesPerCube: v.piecesPerCube,
                inStock: v.inStock,
              },
            })
      ),
    ]);
  }

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, variants: { orderBy: { size: "asc" } } },
    });
    if (updated) {
      revalidateProductPublicPaths(updated.slug);
      if (previousProduct?.slug && previousProduct.slug !== updated.slug) {
        revalidatePath(`/product/${previousProduct.slug}`);
      }
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ошибка сохранения";
    // Map Prisma unique errors to Russian
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Такой slug уже используется другим товаром" },
        { status: 409 }
      );
    }
    if (code === "P2003") {
      return NextResponse.json(
        { error: "Нарушение связей — возможно категория не существует" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkProductsAccess()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  try {
    const productForCache = await prisma.product.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true, slug: true },
    });
    if (!productForCache) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Check if any OrderItem references this product's variants
    const hasOrders = await prisma.orderItem.findFirst({
      where: {
        variant: { productId: productForCache.id },
      },
      select: { id: true },
    });

    if (hasOrders) {
      // Soft delete: mark inactive + hide variants instead of destroying history
      await prisma.$transaction([
        prisma.product.update({
          where: { id: productForCache.id },
          data: { active: false, featured: false },
        }),
        prisma.productVariant.updateMany({
          where: { productId: productForCache.id },
          data: { inStock: false },
        }),
      ]);
      revalidateProductPublicPaths(productForCache?.slug);
      return NextResponse.json({
        ok: true,
        softDelete: true,
        message:
          "Товар скрыт с сайта (soft-delete), так как он используется в заказах. История заказов сохранена.",
      });
    }

    // No orders → safe to hard-delete (Prisma cascade handles variants)
    await prisma.product.delete({ where: { id: productForCache.id } });
    revalidateProductPublicPaths(productForCache?.slug);
    return NextResponse.json({ ok: true, softDelete: false });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Нельзя удалить: товар используется в заказах или других связях. Попробуйте скрыть его (снять галку Активен).",
        },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Ошибка удаления";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
