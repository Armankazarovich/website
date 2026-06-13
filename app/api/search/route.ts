export const dynamic = "force-dynamic";

import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductAvailability } from "@/lib/product-availability";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { getCurrentTenantId } from "@/lib/tenant-context";

function cleanQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

const DIMENSION_SEPARATOR = "\u00d7";
const DIMENSION_SEPARATOR_PATTERN = /[xX\u0445\u0425*]/g;
const DIMENSION_PATTERN = /\d{1,4}\u00d7\d{1,4}(?:\u00d7\d{1,5})?/g;

function normalizeDimensionSeparators(value: string) {
  return value.replace(DIMENSION_SEPARATOR_PATTERN, DIMENSION_SEPARATOR);
}

function normalizeDimensionQuery(value: string) {
  const compact = normalizeDimensionSeparators(value).replace(/\s+/g, "");
  return compact !== value ? compact : "";
}

function dimensionTerms(value: string) {
  const terms = new Set<string>();
  const normalized = normalizeDimensionSeparators(value);
  const compact = normalized.replace(/\s+/g, "");
  for (const candidate of [normalized, compact]) {
    for (const match of candidate.match(DIMENSION_PATTERN) ?? []) {
      terms.add(match);
    }
  }
  return Array.from(terms);
}

function splitSearchTokens(value: string) {
  return normalizeDimensionSeparators(value)
    .split(/[^\p{L}\p{N}\u00d7]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function searchTerms(value: string) {
  return Array.from(
    new Set(
      [
        value,
        normalizeDimensionSeparators(value),
        normalizeDimensionQuery(value),
        ...dimensionTerms(value),
        ...splitSearchTokens(value),
      ].filter((item) => item.length >= 2)
    )
  ).slice(0, 8);
}

function productSearchOr(terms: string[]): Prisma.ProductWhereInput[] {
  return terms.flatMap((term) => [
    { name: { contains: term, mode: "insensitive" as const } },
    { description: { contains: term, mode: "insensitive" as const } },
    { shortDescription: { contains: term, mode: "insensitive" as const } },
    { category: { name: { contains: term, mode: "insensitive" as const } } },
    { variants: { some: { size: { contains: term, mode: "insensitive" as const } } } },
  ]);
}

function productQueryAnd(value: string, variantFilter: Prisma.ProductVariantWhereInput): Prisma.ProductWhereInput[] {
  const dimensions = dimensionTerms(value);
  const textTerms = splitSearchTokens(value).filter((term) => !dimensions.includes(term) && !/^\d+$/.test(term));
  const conditions: Prisma.ProductWhereInput[] = [];

  if (textTerms.length > 0) {
    conditions.push({ OR: productSearchOr(textTerms.slice(0, 5)) });
  }

  if (dimensions.length > 0) {
    conditions.push({
      variants: {
        some: {
          AND: [
            variantFilter,
            { OR: dimensions.map((term) => ({ size: { contains: term, mode: "insensitive" as const } })) },
          ],
        },
      },
    });
  }

  if (conditions.length === 0) {
    conditions.push({ OR: productSearchOr(searchTerms(value)) });
  }

  return conditions;
}

export async function GET(req: NextRequest) {
  const q = cleanQuery(req.nextUrl.searchParams.get("q") || "");
  const categorySlug = cleanQuery(req.nextUrl.searchParams.get("category") || "");
  const minPrice = Number(req.nextUrl.searchParams.get("min") || 0);
  const maxPrice = Number(req.nextUrl.searchParams.get("max") || 0);
  const tenantId = getCurrentTenantId();
  const publicProductFilter = getPublicProductsFilter();
  const publicVariantFilter = getPublicVariantsFilter();

  const categoryWhere: Prisma.CategoryWhereInput = {
    tenantId,
    showInMenu: true,
    ...(categorySlug ? { slug: categorySlug } : {}),
  };

  const publicProductWhere: Prisma.ProductWhereInput = {
    tenantId,
    ...publicProductFilter,
    category: categoryWhere,
  };

  if (q.length < 2) {
    const [categories, featured] = await Promise.all([
      prisma.category.findMany({
        where: {
          tenantId,
          showInMenu: true,
          products: { some: { tenantId, ...publicProductFilter } },
        },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, _count: { select: { products: { where: publicProductWhere } } } },
        take: 8,
      }),
      prisma.product.findMany({
        where: { ...publicProductWhere, featured: true },
        select: {
          id: true,
          slug: true,
          name: true,
          images: true,
          saleUnit: true,
          category: { select: { name: true, slug: true } },
          variants: {
            where: publicVariantFilter,
            select: { pricePerCube: true, pricePerPiece: true },
            take: 1,
            orderBy: { pricePerCube: "asc" },
          },
        },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      results: [],
      categories: [],
      sizes: [],
      popularCategories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products })),
      featuredProducts: featured.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        images: p.images,
        saleUnit: p.saleUnit,
        category: p.category,
        variants: p.variants.map((v) => ({
          pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
          pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
        })),
      })),
    });
  }

  const terms = searchTerms(q);
  const productSearchAnd = productQueryAnd(q, publicVariantFilter);
  const priceVariantFilter: Prisma.ProductVariantWhereInput =
    maxPrice > 0
      ? {
          AND: [
            publicVariantFilter,
            {
              OR: [
                { pricePerCube: { gte: minPrice, lte: maxPrice } },
                { pricePerPiece: { gte: minPrice, lte: maxPrice } },
              ],
            },
          ],
        }
      : publicVariantFilter;

  const where: Prisma.ProductWhereInput = {
    tenantId,
    ...publicProductFilter,
    category: categoryWhere,
    variants: { some: priceVariantFilter },
    AND: productSearchAnd,
  };

  const searchProductWhere: Prisma.ProductWhereInput = {
    tenantId,
    ...publicProductFilter,
    variants: { some: publicVariantFilter },
    AND: productSearchAnd,
  };

  const [products, allMatchingCategories, allMatchingSizes] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: publicVariantFilter,
          select: { pricePerCube: true, pricePerPiece: true, size: true, inStock: true, stockQty: true, lowStockThreshold: true },
          orderBy: { pricePerCube: "asc" },
        },
      },
      take: 15,
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: {
        tenantId,
        showInMenu: true,
        products: { some: searchProductWhere },
      },
      select: { id: true, name: true, slug: true, _count: { select: { products: { where: publicProductWhere } } } },
      take: 5,
    }),
    prisma.productVariant.findMany({
      where: {
        AND: [
          publicVariantFilter,
          { OR: terms.map((term) => ({ size: { contains: term, mode: "insensitive" as const } })) },
        ],
        product: {
          tenantId,
          active: true,
          images: { isEmpty: false },
          category: { tenantId, showInMenu: true },
        },
      },
      select: { size: true },
      distinct: ["size"],
      take: 8,
    }),
  ]);

  const categoryMap = new Map<string, { categoryName: string; categorySlug: string; products: typeof products }>();
  for (const p of products) {
    const key = p.category.slug;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { categoryName: p.category.name, categorySlug: p.category.slug, products: [] });
    }
    categoryMap.get(key)!.products.push(p);
  }

  const toProductPayload = (p: (typeof products)[number]) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    images: p.images,
    saleUnit: p.saleUnit,
    category: p.category,
    inStock: getProductAvailability(p.variants).isPurchasable,
    variants: p.variants.map((v) => ({
      pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
      pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
      size: v.size,
    })),
  });

  return NextResponse.json({
    results: products.map(toProductPayload),
    grouped: Array.from(categoryMap.values()).map((g) => ({
      categoryName: g.categoryName,
      categorySlug: g.categorySlug,
      products: g.products.map(toProductPayload),
    })),
    total: products.length,
    categories: allMatchingCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products })),
    sizes: allMatchingSizes.map((v) => v.size),
    popularCategories: [],
    featuredProducts: [],
  });
}
