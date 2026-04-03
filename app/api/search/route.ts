export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const categorySlug = req.nextUrl.searchParams.get("category") || "";
  const minPrice = Number(req.nextUrl.searchParams.get("min") || 0);
  const maxPrice = Number(req.nextUrl.searchParams.get("max") || 0);

  // Пустой запрос — вернуть популярные данные для "нулевого состояния"
  if (q.length < 2) {
    const [categories, featured] = await Promise.all([
      prisma.category.findMany({
        where: { showInMenu: true, products: { some: { active: true } } },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, _count: { select: { products: { where: { active: true } } } } },
        take: 8,
      }),
      prisma.product.findMany({
        where: { active: true, featured: true },
        select: {
          id: true, slug: true, name: true, images: true, saleUnit: true,
          category: { select: { name: true } },
          variants: { select: { pricePerCube: true, pricePerPiece: true }, take: 1, orderBy: { pricePerCube: "asc" } },
        },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      results: [],
      categories: [],
      sizes: [],
      popularCategories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products })),
      featuredProducts: featured.map(p => ({
        id: p.id, slug: p.slug, name: p.name, images: p.images, saleUnit: p.saleUnit,
        category: p.category,
        variants: p.variants.map(v => ({
          pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
          pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
        })),
      })),
    });
  }

  // Построить условия фильтрации
  const priceFilter = maxPrice > 0
    ? {
        variants: {
          some: {
            OR: [
              { pricePerCube: { gte: minPrice, lte: maxPrice } },
              { pricePerPiece: { gte: minPrice, lte: maxPrice } },
            ],
          },
        },
      }
    : {};

  const categoryFilter = categorySlug
    ? { category: { slug: categorySlug } }
    : {};

  const where = {
    active: true,
    ...categoryFilter,
    ...priceFilter,
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { category: { name: { contains: q, mode: "insensitive" as const } } },
      { variants: { some: { size: { contains: q, mode: "insensitive" as const } } } },
    ],
  };

  const [products, allMatchingCategories, allMatchingSizes] = await Promise.all([
    // Основные результаты
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          select: { pricePerCube: true, pricePerPiece: true, size: true, inStock: true },
          orderBy: { pricePerCube: "asc" },
        },
      },
      take: 15,
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    }),

    // Категории которые встречаются в результатах
    prisma.category.findMany({
      where: {
        products: {
          some: {
            active: true,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { variants: { some: { size: { contains: q, mode: "insensitive" } } } },
            ],
          },
        },
      },
      select: { id: true, name: true, slug: true, _count: { select: { products: { where: { active: true } } } } },
      take: 5,
    }),

    // Размеры которые совпадают с запросом
    prisma.productVariant.findMany({
      where: {
        size: { contains: q, mode: "insensitive" },
        product: { active: true },
      },
      select: { size: true },
      distinct: ["size"],
      take: 8,
    }),
  ]);

  // Группировка по категориям
  const categoryMap = new Map<string, { categoryName: string; categorySlug: string; products: typeof products }>();
  for (const p of products) {
    const key = p.category.slug;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { categoryName: p.category.name, categorySlug: p.category.slug, products: [] });
    }
    categoryMap.get(key)!.products.push(p);
  }

  const grouped = Array.from(categoryMap.values()).map(g => ({
    categoryName: g.categoryName,
    categorySlug: g.categorySlug,
    products: g.products.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      images: p.images,
      saleUnit: p.saleUnit,
      category: p.category,
      inStock: p.variants.some(v => v.inStock),
      variants: p.variants.map(v => ({
        pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
        pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
        size: v.size,
      })),
    })),
  }));

  return NextResponse.json({
    results: products.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      images: p.images,
      saleUnit: p.saleUnit,
      category: p.category,
      inStock: p.variants.some(v => v.inStock),
      variants: p.variants.map(v => ({
        pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
        pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
        size: v.size,
      })),
    })),
    grouped,
    total: products.length,
    categories: allMatchingCategories.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products })),
    sizes: allMatchingSizes.map(v => v.size),
    popularCategories: [],
    featuredProducts: [],
  });
}
