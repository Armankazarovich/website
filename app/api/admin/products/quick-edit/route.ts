export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { normalizeProductCardTags } from "@/lib/product-insights";
import { slugify } from "@/lib/slug";
import { revalidatePath, revalidateTag } from "next/cache";

const PRODUCT_SALE_UNITS = ["CUBE", "PIECE", "SQUARE", "BOTH"] as const;

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

function revalidateProductPublicPaths(slug?: string | null) {
  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/price-list");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/product/${slug}`);
}

function parseNullableMoney(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label}: укажите число от 0`);
  }
  return parsed;
}

function parseNullableInt(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}: укажите целое число от 0`);
  }
  return parsed;
}

function normalizeSize(value: unknown) {
  if (value === undefined) return undefined;
  const size = String(value)
    .trim()
    .replace(/[xXхХ*]/g, "×")
    .replace(/\s+/g, " ");
  if (!size) throw new Error("Размер не может быть пустым");
  if (size.length > 120) throw new Error("Размер слишком длинный");
  return size;
}

function normalizeLimitedText(value: unknown, label: string, maxLength: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return null;
  if (text.length > maxLength) throw new Error(`${label}: слишком длинный текст`);
  return text;
}

function normalizeLongText(value: unknown, label: string, maxLength: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error(`${label}: слишком длинный текст`);
  return text;
}

function normalizeTags(value: unknown) {
  if (value === undefined) return undefined;
  const rawTags = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
  return normalizeProductCardTags(rawTags.map((item) => String(item)));
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

function serializeVariant<T extends Record<string, unknown>>(variant: T) {
  return {
    ...variant,
    pricePerCube: variant.pricePerCube == null ? null : Number(variant.pricePerCube),
    pricePerPiece: variant.pricePerPiece == null ? null : Number(variant.pricePerPiece),
    pricePerSquareMeter: variant.pricePerSquareMeter == null ? null : Number(variant.pricePerSquareMeter),
  };
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const {
    variantId,
    productName,
    productSlug,
    categoryId,
    saleUnit,
    shortDescription,
    description,
    cardTags,
    featured,
    productActive,
    size,
    pricePerCube,
    pricePerPiece,
    pricePerSquareMeter,
    piecesPerCube,
    stockQty,
    lowStockThreshold,
    variantSortOrder,
    inStock,
  } = await req.json();
  if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { tenantId } },
    select: { id: true, productId: true, product: { select: { id: true, slug: true, name: true } } },
  });
  if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variantData: {
    size?: string;
    pricePerCube?: number | null;
    pricePerPiece?: number | null;
    pricePerSquareMeter?: number | null;
    piecesPerCube?: number | null;
    stockQty?: number | null;
    lowStockThreshold?: number;
    sortOrder?: number;
    inStock?: boolean;
  } = {};

  const productData: {
    name?: string;
    slug?: string;
    categoryId?: string;
    saleUnit?: (typeof PRODUCT_SALE_UNITS)[number];
    shortDescription?: string | null;
    description?: string | null;
    cardTags?: string[];
    featured?: boolean;
    active?: boolean;
  } = {};

  try {
    const nextName = normalizeLimitedText(productName, "Название", 200);
    if (nextName !== undefined) {
      if (!nextName) throw new Error("Название товара не может быть пустым");
      productData.name = nextName;
    }

    const nextSlug = normalizeLimitedText(productSlug, "SEO slug", 160);
    if (nextSlug !== undefined) {
      productData.slug = await makeUniqueProductSlug(
        nextSlug || productData.name || variant.product.name,
        variant.productId,
        tenantId
      );
    }

    if (categoryId !== undefined) {
      const category = await prisma.category.findFirst({
        where: { id: String(categoryId), tenantId },
        select: { id: true },
      });
      if (!category) throw new Error("Категория не найдена");
      productData.categoryId = category.id;
    }

    if (saleUnit !== undefined) {
      if (!PRODUCT_SALE_UNITS.includes(saleUnit as (typeof PRODUCT_SALE_UNITS)[number])) {
        throw new Error("Единица продажи должна быть м³, м², шт или смешанная");
      }
      productData.saleUnit = saleUnit as (typeof PRODUCT_SALE_UNITS)[number];
    }

    const nextShortDescription = normalizeLimitedText(shortDescription, "SEO кратко", 500);
    if (nextShortDescription !== undefined) productData.shortDescription = nextShortDescription;

    const nextDescription = normalizeLongText(description, "Описание", 8000);
    if (nextDescription !== undefined) productData.description = nextDescription;

    const nextTags = normalizeTags(cardTags);
    if (nextTags !== undefined) productData.cardTags = nextTags;

    const nextSize = normalizeSize(size);
    if (nextSize !== undefined) {
      const duplicate = await prisma.productVariant.findFirst({
        where: {
          productId: variant.productId,
          id: { not: variant.id },
          size: nextSize,
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ error: `Размер "${nextSize}" уже есть у этого товара` }, { status: 409 });
      }
      variantData.size = nextSize;
    }

    const nextCube = parseNullableMoney(pricePerCube, "Цена за м³");
    const nextPiece = parseNullableMoney(pricePerPiece, "Цена за шт");
    const nextSquare = parseNullableMoney(pricePerSquareMeter, "Цена за м²");
    const nextPiecesPerCube = parseNullableInt(piecesPerCube, "Штук в м³");
    const nextStockQty = parseNullableInt(stockQty, "Остаток");
    const nextLowStock = parseNullableInt(lowStockThreshold, "Порог остатка");
    const nextSortOrder = parseNullableInt(variantSortOrder, "Порядок");

    if (nextCube !== undefined) variantData.pricePerCube = nextCube;
    if (nextPiece !== undefined) variantData.pricePerPiece = nextPiece;
    if (nextSquare !== undefined) variantData.pricePerSquareMeter = nextSquare;
    if (nextPiecesPerCube !== undefined) variantData.piecesPerCube = nextPiecesPerCube;
    if (nextStockQty !== undefined) variantData.stockQty = nextStockQty;
    if (nextLowStock !== undefined) variantData.lowStockThreshold = nextLowStock ?? 0;
    if (nextSortOrder !== undefined) variantData.sortOrder = nextSortOrder ?? 0;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Некорректные данные" },
      { status: 400 }
    );
  }

  if (inStock !== undefined) variantData.inStock = inStock;
  if (featured !== undefined) productData.featured = Boolean(featured);
  if (productActive !== undefined) productData.active = Boolean(productActive);

  const [updatedProduct, updatedVariant] = await prisma.$transaction([
    Object.keys(productData).length > 0
      ? prisma.product.update({
          where: { id: variant.productId },
          data: productData,
          include: { category: { select: { id: true, name: true } } },
        })
      : prisma.product.findUnique({
          where: { id: variant.productId },
          include: { category: { select: { id: true, name: true } } },
        }),
    Object.keys(variantData).length > 0
      ? prisma.productVariant.update({ where: { id: variantId }, data: variantData })
      : prisma.productVariant.findUnique({ where: { id: variantId } }),
  ]);

  revalidateProductPublicPaths(variant.product.slug);
  if (updatedProduct?.slug && updatedProduct.slug !== variant.product.slug) {
    revalidateProductPublicPaths(updatedProduct.slug);
  }

  return NextResponse.json({
    ok: true,
    product: updatedProduct
      ? {
          id: updatedProduct.id,
          name: updatedProduct.name,
          slug: updatedProduct.slug,
          categoryId: updatedProduct.categoryId,
          category: updatedProduct.category,
          saleUnit: updatedProduct.saleUnit,
          active: updatedProduct.active,
          featured: updatedProduct.featured,
          shortDescription: updatedProduct.shortDescription,
          description: updatedProduct.description,
          cardTags: updatedProduct.cardTags,
        }
      : null,
    variant: updatedVariant ? serializeVariant(updatedVariant) : null,
  });
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const { action, productId, active } = await req.json();

  if (action === "toggle_active") {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, slug: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.product.update({ where: { id: product.id }, data: { active: Boolean(active) } });
    revalidateProductPublicPaths(product.slug);
    return NextResponse.json({ ok: true, product: { id: product.id, active: Boolean(active) } });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
