export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: { orderBy: { pricePerCube: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Товары</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="w-4 h-4 mr-2" />
            Добавить товар
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Товар</th>
                <th className="text-left px-4 py-3 font-semibold">Категория</th>
                <th className="text-center px-4 py-3 font-semibold">Вариантов</th>
                <th className="text-right px-4 py-3 font-semibold">Цена от</th>
                <th className="text-center px-4 py-3 font-semibold">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const minPrice = p.variants.reduce((min, v) => {
                  const price = Number(v.pricePerCube ?? v.pricePerPiece ?? 0);
                  return price > 0 && price < min ? price : min;
                }, Infinity);

                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category.name}</td>
                    <td className="px-4 py-3 text-center">{p.variants.length}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {minPrice !== Infinity ? formatPrice(minPrice) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.active ? "default" : "secondary"}>
                        {p.active ? "Активен" : "Скрыт"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/admin/products/${p.id}`}>
                          <Pencil className="w-3 h-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Товаров ещё нет.{" "}
            <Link href="/admin/products/new" className="text-primary hover:underline">
              Добавить первый товар
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
