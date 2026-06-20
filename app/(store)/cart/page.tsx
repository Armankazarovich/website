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
  Package,
  Calculator,
  Phone,
} from "lucide-react";

function CartItemImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-2xl">
        <Package className="w-8 h-8 text-muted-foreground/30" />
      </div>
    );
  }
  return (
    <Image src={src} alt={alt} fill className="object-cover" unoptimized onError={() => setError(true)} />
  );
}
import { readCartItemsFromStorage, useCartStore, type CartItem } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { PHONE_LINK, PHONE_DISPLAY } from "@/lib/phone-constants";
import { trackArayMetrikaGoal } from "@/lib/aray-metrika-goals";
import { getUnitLabel, quantityStepForUnit, type ProductUnitType } from "@/lib/product-units";

function formatCartQuantity(quantity: number, unitType: ProductUnitType) {
  return unitType === "PIECE" ? String(quantity) : quantity.toFixed(1);
}

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
    unitType: ProductUnitType;
    price: number;
  }[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!shareParam || dismissed) return;
    setState("loading");

    try {
      const decoded = JSON.parse(atob(shareParam)) as Array<{ v: string; q: number; u: ProductUnitType }>;

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
      const decoded = JSON.parse(atob(shareParam)) as Array<{ v: string; q: number; u: ProductUnitType }>;
      fetch("/api/cart/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: decoded }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.items) {
            // Map API response to CartItem format and load
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
              {item.productName} {item.variantSize} × {formatCartQuantity(item.quantity, item.unitType)} {getUnitLabel(item.unitType)}
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
async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some in-app browsers block Clipboard API even after a button click.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function ShareCartButton() {
  const { items } = useCartStore();
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");

  const handleShare = useCallback(async () => {
    if (items.length === 0) return;

    const compact = items.map((i) => ({ v: i.variantId, q: i.quantity, u: i.unitType }));
    const encoded = btoa(JSON.stringify(compact));
    const url = `${window.location.origin}/cart?share=${encoded}`;

    const copied = await copyTextToClipboard(url);
    setShareState(copied ? "copied" : "error");
    window.setTimeout(() => setShareState("idle"), copied ? 3000 : 2200);
  }, [items]);

  const copied = shareState === "copied";
  const hasError = shareState === "error";

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all ${
        copied
          ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
          : hasError
            ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10"
      }`}
      title="Скопировать ссылку на корзину"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span className="hidden sm:inline">Ссылка скопирована!</span>
          <span className="sm:hidden">Готово</span>
        </>
      ) : hasError ? (
        <>
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Не удалось скопировать</span>
          <span className="sm:hidden">Ошибка</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Поделиться корзиной</span>
          <span className="sm:hidden">Поделиться</span>
        </>
      )}
    </button>
  );
}

// ─── Main Cart Page ────────────────────────────────────────────────────────────
export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const totalPrice = useCartStore((state) => state.totalPrice);
  const clearCart = useCartStore((state) => state.clearCart);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const [storageFallbackItems, setStorageFallbackItems] = useState<CartItem[]>([]);
  const [cartEffectReady, setCartEffectReady] = useState(false);

  useEffect(() => {
    setCartEffectReady(true);
    const cartStore = useCartStore.getState();
    cartStore.hydrateCart();
    const nextItems = cartStore.items.length > 0 ? cartStore.items : readCartItemsFromStorage();
    if (nextItems.length > 0) {
      cartStore.loadItems(nextItems);
      setStorageFallbackItems(nextItems);
    }
  }, []);

  const visibleItems = items.length > 0 ? items : storageFallbackItems;
  const visibleTotalPrice = visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!hasHydrated) {
    return (
      <div className="container store-mobile-safe-bottom py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div
        data-cart-page-state
        data-store-items={items.length}
        data-fallback-items={storageFallbackItems.length}
        data-visible-items={visibleItems.length}
        data-hydrated={String(hasHydrated)}
        data-effect-ready={String(cartEffectReady)}
        className="container store-mobile-safe-bottom py-12 sm:py-20"
      >
        <Suspense>
          <ShareBanner />
        </Suspense>
        <div data-cart-empty-state className="store-empty-action-card mx-auto max-w-2xl rounded-2xl p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="font-display font-bold text-3xl mb-3">Корзина пуста</h1>
          <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-muted-foreground">
            Добавьте товары из каталога или рассчитайте нужный объём в калькуляторе. Корзину можно будет отправить менеджеру или оформить как заявку.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" asChild>
              <Link href="/catalog">
                Перейти в каталог
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/calculator">
                <Calculator className="mr-2 h-5 w-5" />
                Рассчитать объём
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background/45 p-3">
              <span className="font-semibold text-foreground">Цены по размерам</span>
              <p className="mt-1">В карточках сразу видно м³ или штуки.</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 p-3">
              <span className="font-semibold text-foreground">Быстрый расчёт</span>
              <p className="mt-1">Калькулятор помогает собрать объём.</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 p-3">
              <span className="font-semibold text-foreground">Заявка менеджеру</span>
              <p className="mt-1">Уточним доставку и наличие.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-cart-page-state
      data-store-items={items.length}
      data-fallback-items={storageFallbackItems.length}
      data-visible-items={visibleItems.length}
      data-hydrated={String(hasHydrated)}
      data-effect-ready={String(cartEffectReady)}
      className="container store-mobile-safe-bottom pt-8 pb-14 sm:pb-16"
    >
      {/* Share banner — SSR safe */}
      <Suspense fallback={null}>
        <ShareBanner />
      </Suspense>

      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
        <div className="flex items-center gap-3">
          <BackButton href="/catalog" label="Каталог" className="mb-0" />
          <div>
            <h1 className="font-display font-bold text-3xl">Корзина</h1>
            <p className="text-sm text-muted-foreground">
              {visibleItems.length} {visibleItems.length === 1 ? "позиция" : visibleItems.length < 5 ? "позиции" : "позиций"} к оформлению
            </p>
          </div>
        </div>
        <ShareCartButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              data-cart-item
              className="flex gap-3 p-3 sm:gap-4 sm:p-4 bg-card rounded-2xl border border-border"
            >
              {/* Image */}
              <div className="relative h-[4.5rem] w-[4.5rem] sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                {item.productImage ? (
                  <CartItemImage src={item.productImage} alt={item.productName} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="font-display font-semibold text-sm leading-snug hover:text-primary transition-colors sm:text-base"
                >
                  {item.productName}
                </Link>
                <p className="text-sm text-muted-foreground">{item.variantSize}</p>
                <p className="text-sm font-medium text-primary">
                  {formatPrice(item.price)} / {getUnitLabel(item.unitType)}
                </p>

                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mt-3">
                  {/* Quantity */}
                  <div className="store-quantity-control">
                    <button
                      aria-label="Уменьшить количество"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          parseFloat((item.quantity - quantityStepForUnit(item.unitType)).toFixed(1))
                          )
                      }
                      data-cart-qty-minus
                      className="store-quantity-button is-minus"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span data-cart-qty-value className="store-quantity-value">
                      {formatCartQuantity(item.quantity, item.unitType)} {getUnitLabel(item.unitType)}
                    </span>
                    <button
                      aria-label="Увеличить количество"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          parseFloat((item.quantity + quantityStepForUnit(item.unitType)).toFixed(1))
                          )
                      }
                      data-cart-qty-plus
                      className="store-quantity-button"
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

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => { clearCart(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-muted-foreground">
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить корзину
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/catalog">Продолжить покупки</Link>
            </Button>
          </div>
        </div>

        {/* Order summary */}
        <div>
          <div className="lg:sticky lg:top-24 bg-card rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-display font-bold text-xl">Итого</h2>

            <div className="space-y-2 text-sm">
              {visibleItems.map((item) => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span className="line-clamp-1 mr-2">
                    {item.productName} × {formatCartQuantity(item.quantity, item.unitType)} {getUnitLabel(item.unitType)}
                  </span>
                  <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 flex justify-between items-center">
              <span className="font-medium">Сумма заказа:</span>
              <span className="font-display font-bold text-2xl text-primary">
                {formatPrice(items.length > 0 ? totalPrice() : visibleTotalPrice)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              + стоимость доставки (уточняется менеджером)
            </p>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">После заявки:</span>{" "}
              менеджер проверит наличие, рассчитает доставку и подтвердит финальную сумму.
            </div>

            <Button size="lg" className="w-full" asChild>
              <Link
                data-cart-checkout-link
                href="/checkout"
                onClick={() =>
                  trackArayMetrikaGoal("aray_checkout_start", {
                    source: "cart_page",
                    total: items.length > 0 ? totalPrice() : visibleTotalPrice,
                    count: visibleItems.length,
                  })
                }
              >
                Оформить заказ
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Или позвоните:{" "}
              <a href={`tel:${PHONE_LINK}`} className="inline-flex items-center gap-1 text-primary font-medium hover:underline whitespace-nowrap">
                <Phone className="h-3.5 w-3.5" />
                {PHONE_DISPLAY}
              </a>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
