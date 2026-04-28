export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsClient } from "./products-client";
import { ProductsActions } from "./products-actions";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        variants: { orderBy: { pricePerCube: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Товары</h1>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link href="/admin/products/audit">
              <Stethoscope className="w-4 h-4 mr-2" />
              Аудит каталога
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/products/import-prices">
              <FileCheck className="w-4 h-4 mr-2" />
              Импорт цен
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="w-4 h-4 mr-2" />
              Добавить товар
            </Link>
          </Button>
        </div>
      </div>

      <ProductsClient products={products as any} categories={categories} />
      <ProductsActions />
    </div>
  );
}
