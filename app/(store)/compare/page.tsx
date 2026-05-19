"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, ShoppingCart, Trash2, X } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { useCompareStore, type CompareItem } from "@/store/compare";
import { formatPrice } from "@/lib/utils";

function getBestPrice(item: CompareItem) {
  const piecePrices = item.variants
    .map((variant) => variant.pricePerPiece)
    .filter((price): price is number => typeof price === "number" && price > 0);
  const cubePrices = item.variants
    .map((variant) => variant.pricePerCube)
    .filter((price): price is number => typeof price === "number" && price > 0);

  if (piecePrices.length > 0) {
    return { value: Math.min(...piecePrices), unit: "шт" };
  }
  if (cubePrices.length > 0) {
    return { value: Math.min(...cubePrices), unit: "м³" };
  }
  return null;
}

function getSizes(item: CompareItem) {
  return item.variants.map((variant) => variant.size).slice(0, 5).join(", ");
}

function getUnitLabel(item: CompareItem) {
  if (item.saleUnit === "BOTH") return "м³ и шт";
  if (item.saleUnit === "CUBE") return "м³";
  return "шт";
}

function getDescription(item: CompareItem) {
  const text = (item.shortDescription || item.description || "").replace(/\s+/g, " ").trim();
  if (!text) return "Описание пока не заполнено";
  return text.length > 140 ? `${text.slice(0, 137).trim()}...` : text;
}

const comparisonRows: Array<{ label: string; getValue: (item: CompareItem) => string }> = [
  { label: "Категория", getValue: (item) => item.category },
  {
    label: "Цена от",
    getValue: (item) => {
      const price = getBestPrice(item);
      return price ? `${formatPrice(price.value)} / ${price.unit}` : "по запросу";
    },
  },
  { label: "Единица", getValue: getUnitLabel },
  {
    label: "Наличие",
    getValue: (item) => item.variants.some((variant) => variant.inStock) ? "есть в наличии" : "уточнить",
  },
  { label: "Размеры", getValue: (item) => getSizes(item) || "не указаны" },
  { label: "Описание", getValue: getDescription },
];

export default function ComparePage() {
  const { items, remove, clear } = useCompareStore();

  return (
    <div className="container store-mobile-safe-bottom py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton href="/catalog" label="Каталог" className="mb-0 mt-1 shrink-0" />
          <div>
            <h1 className="flex items-center gap-3 font-display text-3xl font-bold">
              <GitCompareArrows className="h-7 w-7 text-primary" />
              Сравнение
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length > 0
                ? `${items.length} товар${items.length === 1 ? "" : items.length < 5 ? "а" : "ов"} в сравнении`
                : "Выберите товары в каталоге"}
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Очистить
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="store-empty-action-card flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center sm:py-16">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <GitCompareArrows className="h-12 w-12" />
          </div>
          <h2 className="mb-2 font-display text-xl font-bold">Сравнение пока пустое</h2>
          <p className="mb-8 max-w-sm text-sm text-muted-foreground">
            Добавьте несколько товаров, чтобы быстро увидеть разницу по цене, размерам и единицам.
          </p>
          <Button asChild>
            <Link href="/catalog">
              Перейти в каталог <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const price = getBestPrice(item);
              return (
                <article
                  key={item.id}
                  className="relative overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label="Убрать из сравнения"
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/[0.85] text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Link href={`/product/${item.slug}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {item.category}
                      </p>
                      <h2 className="font-display text-lg font-bold leading-tight line-clamp-2">{item.name}</h2>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {getDescription(item)}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                          <p className="text-[10px] uppercase text-muted-foreground">Цена от</p>
                          <p className="mt-1 font-display text-xl font-bold text-primary">
                            {price ? `${formatPrice(price.value)} / ${price.unit}` : "по запросу"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                          <p className="text-[10px] uppercase text-muted-foreground">Размеров</p>
                          <p className="mt-1 font-display text-xl font-bold">{item.variants.length}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-lg font-bold">Таблица сравнения</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {comparisonRows.map(({ label, getValue }) => (
                    <tr key={label}>
                      <th className="w-44 bg-muted/[0.35] px-4 py-3 align-top font-semibold text-muted-foreground">
                        {label}
                      </th>
                      {items.map((item) => (
                        <td key={item.id} className="min-w-56 px-4 py-3 align-top">
                          {getValue(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Нужно выбрать лучший вариант?</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Арай может объяснить разницу и помочь посчитать объем под задачу.
                </p>
              </div>
              <Button asChild>
                <Link href="/cart">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  К корзине
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
