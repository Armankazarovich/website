"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag, Trash2, ArrowRight, GitCompareArrows } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export default function WishlistPage() {
  const { items, remove, clear, hydrateWishlist } = useWishlistStore();
  const addToCompare = useCompareStore((state) => state.add);
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    hydrateWishlist();
  }, [hydrateWishlist]);

  const compareSavedItems = () => {
    items.slice(0, 6).forEach((item) => addToCompare(item));
    router.push("/compare");
  };

  return (
    <div className="container store-mobile-safe-bottom py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton href="/catalog" label="Каталог" className="mb-0 mt-1 shrink-0" />
          <div>
            <h1 className="flex items-center gap-3 font-display text-2xl font-bold md:text-3xl">
              <Heart className="h-6 w-6 fill-red-500 text-red-500 md:h-7 md:w-7" />
              Избранное
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length > 0
                ? `${items.length} товар${items.length === 1 ? "" : items.length < 5 ? "а" : "ов"} сохранено`
                : "Пока ничего нет"}
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Очистить всё
          </button>
        )}
      </div>

      {items.length === 0 ? (
        /* Empty state */
        <div className="store-empty-action-card mx-auto flex max-w-3xl flex-col items-center justify-center rounded-2xl p-6 text-center sm:p-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="mb-2 font-display text-xl font-bold">Список избранного пуст</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Нажмите кнопку избранного на любом товаре, чтобы сохранить его здесь и вернуться позже
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/catalog">
                Перейти в каталог <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/calculator">Рассчитать объём</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Сохранённые товары готовы к выбору</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Сравните избранное по цене, размерам и единицам, а затем добавьте нужное в корзину.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {items.length > 1 && (
                <Button type="button" variant="outline" onClick={compareSavedItems}>
                  <GitCompareArrows className="mr-2 h-4 w-4" />
                  Сравнить
                </Button>
              )}
              <Button asChild>
                <Link href="/catalog">Продолжить выбор</Link>
              </Button>
            </div>
          </div>

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
                cardTags={item.cardTags}
                saleUnit={item.saleUnit}
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

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => { setConfirmClear(false); clear(); }}
        title="Очистить избранное?"
        description="Все товары из списка избранного будут удалены."
        confirmLabel="Очистить"
        variant="danger"
      />
    </div>
  );
}
