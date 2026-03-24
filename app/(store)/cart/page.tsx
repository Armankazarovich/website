"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  Share2,
  Check,
  X,
  Download,
  Users,
  Loader2,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";

// ─── Share Banner (detects ?share= param) ─────────────────────────────────────
function ShareBanner() {
  const searchParams = useSearchParams();
  const shareParam = searchParams.get("share");
  const { items: currentItems, loadItems } = useCartStore();

  const [state, setState] = useState<"idle" | "loading" | "preview" | "done" | "error">("idle");
  const [previewItems, setPreviewItems] = useState<{
    productName: string;
    variantSize: string;
    quantity: number;
    unitType: "CUBE" | "PIECE";
    price: number;
  }[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!shareParam || dismissed) return;
    setState("loading");

    try {
      const decoded = JSON.parse(atob(shareParam)) as Array<{ v: string; q: number; u: "CUBE" | "PIECE" }>;

      fetch("/api/cart/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: decoded }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.items && data.items.length > 0) {
            setPreviewItems(data.items);
            setState("preview");
          } else {
            setState("error");
          }
        })
        .catch(() => setState("error"));
    } catch {
      setState("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareParam]);

  const handleLoad = useCallback(() => {
    if (!shareParam) return;
    try {
      const decoded = JSON.parse(atob(shareParam)) as Array<{ v: string; q: number; u: "CUBE" | "PIECE" }>;
      fetch("/api/cart/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: decoded }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.items) {
            // Map API response to CartItem format and load
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cartItems = data.items.map((i: any) => ({
              id: `${i.variantId}-${i.unitType}`,
              variantId: i.variantId,
              productId: i.productId,
              productName: i.productName,
              productSlug: i.productSlug,
              productImage: i.productImage,
              variantSize: i.variantSize,
              unitType: i.unitType,
              quantity: i.quantity,
              price: i.price,
            }));
            loadItems(cartItems);
            setState("done");
          }
        });
    } catch {
      setState("error");
    }
  }, [shareParam, loadItems]);

  if (!shareParam || dismissed || state === "idle") return null;

  if (state === "loading") {
    return (
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">Загружаем корзину от прораба...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between gap-3">
        <p className="text-sm text-red-700 dark:text-red-300">Не удалось загрузить поделённую корзину — ссылка устарела или товары недоступны.</p>
        <button onClick={() => setDismissed(true)} className="text-red-400 hover:text-red-600 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
            Корзина загружена! {previewItems.length} {previewItems.length === 1 ? "товар" : previewItems.length < 5 ? "товара" : "товаров"} добавлено.
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-green-400 hover:text-green-600 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // state === "preview"
  const totalVal = previewItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <div className="mb-6 bg-brand-orange/5 border border-brand-orange/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-brand-orange/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-orange/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-brand-orange" />
          </div>
          <div>
            <p className="font-semibold text-sm">Вам поделились корзиной</p>
            <p className="text-xs text-muted-foreground">
              {previewItems.length} {previewItems.length === 1 ? "позиция" : previewItems.length < 5 ? "позиции" : "позиций"} · {formatPrice(totalVal)}
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preview items */}
      <div className="px-5 py-3 space-y-1.5 max-h-40 overflow-y-auto">
        {previewItems.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground truncate mr-2">
              {item.productName} {item.variantSize} × {item.unitType === "CUBE" ? item.quantity.toFixed(1) + " м³" : item.quantity + " шт"}
            </span>
            <span className="shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-brand-orange/20 flex gap-3">
        <Button
          size="sm"
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
          onClick={handleLoad}
        >
          <Download className="w-4 h-4 mr-2" />
          {currentItems.length > 0 ? "Заменить мою корзину" : "Загрузить в корзину"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
          Отмена
        </Button>
      </div>
    </div>
  );
}

// ─── Share Button ─────────────────────────────────────────────────────────────
function ShareCartButton() {
  const { items } = useCartStore();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    if (items.length === 0) return;

    const compact = items.map((i) => ({ v: i.variantId, q: i.quantity, u: i.unitType }));
    const encoded = btoa(JSON.stringify(compact));
    const url = `${window.location.origin}/cart?share=${encoded}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }, [items]);

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all ${
        copied
          ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent"
      }`}
      title="Скопировать ссылку на корзину"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Ссылка скопирована!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          Поделиться корзиной
        </>
      )}
    </button>
  );
}

// ─── Main Cart Page ────────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <Suspense>
          <ShareBanner />
        </Suspense>
        <ShoppingCart className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
        <h1 className="font-display font-bold text-3xl mb-4">Корзина пуста</h1>
        <p className="text-muted-foreground mb-8">
          Выберите нужные товары из нашего каталога
        </p>
        <Button size="lg" asChild>
          <Link href="/catalog">
            Перейти в каталог
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Share banner — SSR safe */}
      <Suspense fallback={null}>
        <ShareBanner />
      </Suspense>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BackButton href="/catalog" label="Каталог" className="mb-0" />
          <h1 className="font-display font-bold text-3xl">Корзина</h1>
        </div>
        <ShareCartButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 bg-card rounded-2xl border border-border"
            >
              {/* Image */}
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                {item.productImage ? (
                  <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🪵</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="font-display font-semibold text-base hover:text-primary transition-colors"
                >
                  {item.productName}
                </Link>
                <p className="text-sm text-muted-foreground">{item.variantSize}</p>
                <p className="text-sm font-medium text-primary">
                  {formatPrice(item.price)} / {item.unitType === "CUBE" ? "м³" : "шт"}
                </p>

                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mt-3">
                  {/* Quantity */}
                  <div className="flex items-center border border-border rounded-lg overflow-hidden w-fit">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          parseFloat((item.quantity - (item.unitType === "CUBE" ? 0.1 : 1)).toFixed(1))
                        )
                      }
                      className="px-3 py-1.5 hover:bg-accent transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium min-w-[3rem] text-center">
                      {item.unitType === "CUBE"
                        ? item.quantity.toFixed(1)
                        : item.quantity}{" "}
                      {item.unitType === "CUBE" ? "м³" : "шт"}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          parseFloat((item.quantity + (item.unitType === "CUBE" ? 0.1 : 1)).toFixed(1))
                        )
                      }
                      className="px-3 py-1.5 hover:bg-accent transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Total + remove */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" onClick={clearCart} className="text-muted-foreground">
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить корзину
            </Button>
            <Button variant="outline" asChild>
              <Link href="/catalog">Продолжить покупки</Link>
            </Button>
          </div>
        </div>

        {/* Order summary */}
        <div>
          <div className="sticky top-24 bg-card rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-display font-bold text-xl">Итого</h2>

            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span className="line-clamp-1 mr-2">
                    {item.productName} × {item.unitType === "CUBE" ? item.quantity.toFixed(1) : item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                  </span>
                  <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 flex justify-between items-center">
              <span className="font-medium">Сумма заказа:</span>
              <span className="font-display font-bold text-2xl text-primary">
                {formatPrice(totalPrice())}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              + стоимость доставки (уточняется менеджером)
            </p>

            <Button size="lg" className="w-full" asChild>
              <Link href="/checkout">
                Оформить заказ
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Или позвоните:{" "}
              <a href="tel:+79859707133" className="text-primary font-medium hover:underline">
                8-985-970-71-33
              </a>
            </div>

            {/* Share shortcut in sidebar */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2 text-center">Отправить список прорабу:</p>
              <ShareCartButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
