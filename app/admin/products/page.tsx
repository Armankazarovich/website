export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { ProductsClient } from "./products-client";
import { ProductsActions } from "./products-actions";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        active: true,
        featured: true,
        images: true,
        description: true,
        category: { select: { name: true } },
        variants: {
          select: {
            pricePerCube: true,
            pricePerPiece: true,
            inStock: true,
          },
          orderBy: { pricePerCube: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const clientProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    active: product.active,
    featured: product.featured,
    images: product.images,
    description: product.description,
    category: { name: product.category.name },
    variants: product.variants.map((variant) => ({
      pricePerCube: variant.pricePerCube?.toString() ?? null,
      pricePerPiece: variant.pricePerPiece?.toString() ?? null,
      inStock: variant.inStock,
    })),
  }));
  const clientCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <div className="space-y-6">
      <ProductsClient products={clientProducts} categories={clientCategories} />
      <ProductsActions />
    </div>
  );
}
