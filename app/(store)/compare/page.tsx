"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, ShoppingCart, Trash2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
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

function getSizes(item: CompareItem, limit = 6) {
  const sizes = item.variants.map((variant) => variant.size);
  const visible = sizes.slice(0, limit).join(", ");
  const hiddenCount = sizes.length - limit;
  return hiddenCount > 0 ? `${visible} и еще ${hiddenCount}` : visible;
}

function getUnitLabel(item: CompareItem) {
  if (item.saleUnit === "BOTH") return "м³ и шт";
  if (item.saleUnit === "CUBE") return "м³";
  return "шт";
}

function productCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "товара";
  return "товаров";
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
    getValue: (item) =>
      item.variants.some((variant) => variant.inStock) ? "есть в наличии" : "уточнить",
  },
  { label: "Размеров", getValue: (item) => `${item.variants.length}` },
  { label: "Размеры", getValue: (item) => getSizes(item) || "не указаны" },
];

function MobileComparisonFacts({ items }: { items: CompareItem[] }) {
  return (
    <div className="space-y-3 md:hidden">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Характеристики</p>
        <h2 className="mt-1 font-display text-lg font-bold">Короткое сравнение</h2>
      </div>
      {items.map((item) => (
        <section key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.images[0] ? (
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {item.category}
              </p>
              <h3 className="mt-1 text-sm font-bold leading-snug line-clamp-2">{item.name}</h3>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {comparisonRows.map(({ label, getValue }) => (
              <div key={label} className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
                <dt className="text-[10px] uppercase text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-semibold leading-snug">{getValue(item)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export default function ComparePage() {
  const { items, clear, hydrateCompare } = useCompareStore();

  useEffect(() => {
    hydrateCompare();
  }, [hydrateCompare]);

  return (
    <div data-compare-page className="container store-mobile-safe-bottom py-6 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton href="/catalog" label="Каталог" className="mb-0 mt-1 shrink-0" />
          <div>
            <h1 className="flex items-center gap-3 font-display text-2xl font-bold md:text-3xl">
              <GitCompareArrows className="h-6 w-6 text-primary md:h-7 md:w-7" />
              Сравнение
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length > 0
                ? `${items.length} ${productCountLabel(items.length)} в сравнении`
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
        <div data-compare-empty className="store-empty-action-card mx-auto flex max-w-3xl flex-col items-center justify-center rounded-2xl p-6 text-center sm:p-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GitCompareArrows className="h-8 w-8" />
          </div>
          <h2 className="mb-2 font-display text-xl font-bold">Сравнение пока пустое</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} data-compare-item={item.id}>
                <ProductCard
                  id={item.id}
                  slug={item.slug}
                  name={item.name}
                  category={item.category}
                  shortDescription={item.shortDescription}
                  description={item.description}
                  images={item.images}
                  cardTags={item.cardTags}
                  saleUnit={item.saleUnit}
                  variants={item.variants}
                />
              </div>
            ))}
          </div>

          <MobileComparisonFacts items={items} />

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Характеристики</p>
              <h2 className="mt-1 font-display text-lg font-bold">Таблица сравнения</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="w-48 bg-muted/[0.32] px-4 py-3 align-top text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Характеристика
                    </th>
                    {items.map((item) => (
                      <th key={item.id} className="min-w-60 px-4 py-3 align-top">
                        <Link href={`/product/${item.slug}`} className="flex items-center gap-3">
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                            {item.images[0] ? (
                              <Image
                                src={item.images[0]}
                                alt={item.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              {item.category}
                            </span>
                            <span className="mt-1 block font-display text-sm font-bold leading-snug line-clamp-2">
                              {item.name}
                            </span>
                          </span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comparisonRows.map(({ label, getValue }) => (
                    <tr key={label}>
                      <th className="w-48 bg-muted/[0.32] px-4 py-3 align-top font-semibold text-muted-foreground">
                        {label}
                      </th>
                      {items.map((item) => (
                        <td key={item.id} className="min-w-60 px-4 py-3 align-top font-medium leading-relaxed">
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
                  Менеджер поможет сравнить позиции и посчитать объем под задачу.
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
