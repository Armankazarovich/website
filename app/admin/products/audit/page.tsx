export const dynamic = "force-dynamic";

/**
 * /admin/products/audit
 *
 * Диагностика каталога перед запуском Директа:
 *  - Варианты без цены (не покупаются)
 *  - Варианты не в наличии
 *  - Товары без фото
 *  - Товары без описания
 *  - Пустые категории
 *  - Возможные дубли (по имени)
 *  - Товары у которых ВСЕ варианты скрыты → авто-деактивация товара
 *
 * Действия: скрыть варианты без цены/наличия, вернуть скрытые, деактивировать товар.
 * Ничего не удаляется — только скрытие (inStock=false / active=false).
 */

import { prisma } from "@/lib/prisma";
import { AuditClient } from "./audit-client";

export default async function ProductsAuditPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          orderBy: { pricePerCube: "asc" },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // Сериализуем Decimal в number для клиента
  const serialized = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    images: p.images,
    active: p.active,
    featured: p.featured,
    category: p.category,
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
      pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
      piecesPerCube: v.piecesPerCube,
      inStock: v.inStock,
      stockQty: v.stockQty,
    })),
  }));

  const emptyCategories = categories.filter((c) => c._count.products === 0);

  return (
    <AuditClient
      products={serialized}
      emptyCategories={emptyCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
    />
  );
}
