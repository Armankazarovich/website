"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Product = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  active: boolean;
  variants: { pricePerCube: any; pricePerPiece: any }[];
  category: { name: string };
};

type Category = { id: string; name: string };

export function ProductsClient({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryId === "ALL" || p.categoryId === categoryId;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, search, categoryId]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="py-2 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="ALL">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground self-center">
          {filtered.length} из {products.length}
        </span>
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
              {filtered.map((p) => {
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
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {products.length === 0 ? (
              <>Товаров ещё нет.{" "}
                <Link href="/admin/products/new" className="text-primary hover:underline">
                  Добавить первый товар
                </Link>
              </>
            ) : "Ничего не найдено по вашему запросу"}
          </p>
        )}
      </div>
    </>
  );
}
