"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Search, AlertTriangle, CheckCircle2, XCircle, ArrowUpDown, FileDown } from "lucide-react";

type Variant = {
  id: string;
  size: string;
  pricePerCube: unknown;
  pricePerPiece: unknown;
  inStock: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    saleUnit: string;
    category: { name: string };
  };
};

export function InventoryClient({ variants }: { variants: Variant[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const filtered = variants.filter((v) => {
    const matchSearch =
      !search ||
      v.product.name.toLowerCase().includes(search.toLowerCase()) ||
      v.size.toLowerCase().includes(search.toLowerCase()) ||
      v.product.category.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "in" && v.inStock) ||
      (filter === "out" && !v.inStock);
    return matchSearch && matchFilter;
  });

  const totalIn = variants.filter((v) => v.inStock).length;
  const totalOut = variants.filter((v) => !v.inStock).length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Склад / Остатки</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {variants.length} вариантов · {totalIn} в наличии · {totalOut} нет в наличии
          </p>
        </div>
        <Link
          href="/admin/import"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
        >
          <FileDown className="w-4 h-4 text-primary" />
          Импорт / Экспорт
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`p-3 rounded-xl border text-left transition-colors ${filter === "all" ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent"}`}
        >
          <p className="text-2xl font-bold">{variants.length}</p>
          <p className="text-xs text-muted-foreground">Всего вариантов</p>
        </button>
        <button
          onClick={() => setFilter("in")}
          className={`p-3 rounded-xl border text-left transition-colors ${filter === "in" ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-card hover:bg-accent"}`}
        >
          <p className="text-2xl font-bold text-emerald-600">{totalIn}</p>
          <p className="text-xs text-muted-foreground">В наличии</p>
        </button>
        <button
          onClick={() => setFilter("out")}
          className={`p-3 rounded-xl border text-left transition-colors ${filter === "out" ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent"}`}
        >
          <p className="text-2xl font-bold text-destructive">{totalOut}</p>
          <p className="text-xs text-muted-foreground">Нет в наличии</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по товару, размеру, категории..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Товар</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Категория</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Размер</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" />Цена м³</span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Цена шт</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Наличие</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Ничего не найдено
                  </td>
                </tr>
              )}
              {filtered.map((v) => (
                <tr key={v.id} className={`hover:bg-muted/20 transition-colors ${!v.inStock ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${v.product.id}`} className="font-medium hover:text-primary transition-colors line-clamp-1">
                      {v.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{v.product.category.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{v.size}</td>
                  <td className="px-4 py-3">
                    {v.pricePerCube ? (
                      <span className="font-medium">{Number(v.pricePerCube).toLocaleString("ru-RU")} ₽</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.pricePerPiece ? (
                      <span>{Number(v.pricePerPiece).toLocaleString("ru-RU")} ₽</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.inStock ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> В наличии
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Нет
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${v.product.id}?tab=variants`}
                      className="text-xs text-primary hover:underline whitespace-nowrap"
                    >
                      Изменить →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">Числовые остатки — скоро</p>
          <p className="text-muted-foreground mt-0.5">
            Сейчас отображается только статус "В наличии / Нет". Числовые остатки (м³/шт) и история изменений появятся после обновления базы данных.
          </p>
        </div>
      </div>
    </div>
  );
}
