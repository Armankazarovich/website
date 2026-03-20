"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const { items, remove, clear } = useWishlistStore();

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-3">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            Избранное
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length > 0
              ? `${items.length} товар${items.length === 1 ? "" : items.length < 5 ? "а" : "ов"} сохранено`
              : "Пока ничего нет"}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => { if (confirm("Очистить весь список избранного?")) clear(); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Очистить всё
          </button>
        )}
      </div>

      {items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 rounded-3xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-6">
            <Heart className="w-12 h-12 text-red-200 dark:text-red-800" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Список избранного пуст</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-xs">
            Нажмите ❤️ на любом товаре, чтобы сохранить его здесь и вернуться позже
          </p>
          <Button asChild>
            <Link href="/catalog">
              Перейти в каталог <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                slug={item.slug}
                name={item.name}
                category={item.category}
                images={item.images}
                saleUnit={item.saleUnit as any}
                variants={item.variants}
              />
            ))}
          </div>

          {/* CTA bottom */}
          <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Готовы сделать заказ?</p>
              <p className="text-sm text-muted-foreground mt-0.5">Добавьте товары в корзину и оформите заявку</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/catalog">Продолжить выбор</Link>
              </Button>
              <Button asChild>
                <Link href="/cart">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  В корзину
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
