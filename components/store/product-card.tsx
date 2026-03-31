"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, ChevronRight, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { WishlistButton } from "@/components/store/wishlist-button";
import { flyToCart } from "@/lib/cart-fly";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

const PUSH_TOAST_KEY = "push_cart_toast_shown";

async function enablePushFromToast(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!vapidKey || !("Notification" in window) || !("PushManager" in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const b64 = (s: string) => { const p = "=".repeat((4-s.length%4)%4); const b=(s+p).replace(/-/g,"+").replace(/_/g,"/"); return Uint8Array.from([...atob(b)].map(c=>c.charCodeAt(0))); };
    const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapidKey) as unknown as BufferSource });
    const k = sub.getKey("p256dh"); const a = sub.getKey("auth");
    if (k && a) {
      const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
      await fetch("/api/push/subscribe", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: toB64(k), auth: toB64(a) } }) });
    }
    return true;
  } catch { return false; }
}

interface Variant {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  piecesPerCube: number | null;
  inStock: boolean;
}

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  category: string;
  images: string[];
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  variants: Variant[];
  featured?: boolean;
}

/* Градиент-заглушка когда нет фото */
const FALLBACK_GRADIENT =
  "bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-brand-brown/80";

export function ProductCard({
  id, slug, name, category, images, saleUnit, variants, featured,
}: ProductCardProps) {
  const { addItem, updateQuantity, items } = useCartStore();
  const { toast } = useToast();

  const activeVariants = variants.filter((v) => v.inStock);
  const hasStock = activeVariants.length > 0;

  const defaultVariant = activeVariants[0] || variants[0];

  // ID-based selection — avoids server/client hydration mismatch
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedVariant = selectedId
    ? (variants.find((v) => v.id === selectedId) ?? defaultVariant)
    : defaultVariant;

  // Expand all sizes on "+N" click
  const [showAllSizes, setShowAllSizes] = useState(false);

  const unitType = saleUnit === "PIECE" ? "PIECE" : "CUBE";
  const selectedPrice = selectedVariant
    ? Number(unitType === "CUBE" ? selectedVariant.pricePerCube : selectedVariant.pricePerPiece) || null
    : null;

  // Live quantity from cart store
  const cartItemId = selectedVariant ? `${selectedVariant.id}-${unitType}` : null;
  const cartQty = cartItemId ? (items.find((i) => i.id === cartItemId)?.quantity ?? 0) : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedVariant || !hasStock) return;
    const price = unitType === "CUBE" ? selectedVariant.pricePerCube : selectedVariant.pricePerPiece;
    if (!price) return;

    flyToCart(e.currentTarget as HTMLElement, images[0] ?? null);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }

    addItem({
      variantId: selectedVariant.id,
      productId: id,
      productName: name,
      productSlug: slug,
      variantSize: selectedVariant.size,
      productImage: images[0],
      unitType,
      quantity: 1,
      price: Number(price),
    });

    // Push-тост — один раз за сессию, только если ещё не подписан
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default" &&
      !sessionStorage.getItem(PUSH_TOAST_KEY)
    ) {
      sessionStorage.setItem(PUSH_TOAST_KEY, "1");
      setTimeout(() => {
        toast({
          title: "Товар добавлен в корзину 🛒",
          description: "Включить уведомления об изменении цен и акциях?",
          duration: 8000,
          action: (
            <ToastAction
              altText="Включить уведомления"
              onClick={async () => {
                const ok = await enablePushFromToast();
                if (ok) toast({ title: "✓ Уведомления включены!", duration: 3000 });
              }}
            >
              Включить
            </ToastAction>
          ),
        });
      }, 1200);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItemId) return;
    if (cartQty === 0) {
      // First add — use handleAdd logic but triggered from + button
      const btn = e.currentTarget as HTMLElement;
      if (!selectedVariant || !hasStock) return;
      const price = unitType === "CUBE" ? selectedVariant.pricePerCube : selectedVariant.pricePerPiece;
      if (!price) return;
      flyToCart(btn, images[0] ?? null);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
      addItem({ variantId: selectedVariant.id, productId: id, productName: name, productSlug: slug, variantSize: selectedVariant.size, productImage: images[0], unitType, quantity: 1, price: Number(price) });
    } else {
      updateQuantity(cartItemId, parseFloat((cartQty + 1).toFixed(1)));
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItemId) return;
    updateQuantity(cartItemId, parseFloat((cartQty - 1).toFixed(1)));
  };

  /* Показываем первые 3 размера + счётчик остальных */
  const shownSizes = showAllSizes ? variants : variants.slice(0, 3);
  const extraCount = showAllSizes ? 0 : variants.length - shownSizes.length;
  const unit = saleUnit === "PIECE" ? "шт" : "м³";

  return (
    <div className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:shadow-black/8 hover:-translate-y-0.5 hover:border-primary/25 transition-all duration-300">

      {/* ── Изображение ── */}
      <Link href={`/product/${slug}`} className="block relative aspect-[4/3] overflow-hidden">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={name}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
            sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 280px"
            unoptimized
          />
        ) : (
          /* Красивый градиент если нет фото */
          <div className={`absolute inset-0 ${FALLBACK_GRADIENT} flex items-center justify-center`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-white/20">
              <rect x="2" y="8" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="13" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="3" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="18" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        )}

        {/* Верхняя строка: бейджи слева + wishlist справа — одна высота */}
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
          {/* Левые бейджи */}
          <div className="flex items-center gap-1.5">
            {featured && (
              <span className="inline-flex items-center gap-1 h-7 bg-brand-orange text-white text-[10px] font-bold px-2.5 rounded-xl shadow-md uppercase tracking-wide">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C10 6 6 8 6 12.5C6 16.6 8.9 20 12 20C15.1 20 18 16.6 18 12.5C18 10 16.5 8 15 6.5C15 8 14.3 9.5 13 10.5C13.5 8.5 12 4 12 2Z"/>
                </svg>
                Хит
              </span>
            )}
            <span className={`inline-flex items-center gap-1 h-7 text-[10px] font-semibold px-2.5 rounded-xl shadow-md backdrop-blur-sm ${
              hasStock
                ? "bg-emerald-500/90 text-white"
                : "bg-black/50 text-white/70"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasStock ? "bg-white animate-pulse" : "bg-white/40"}`} />
              {hasStock ? "В наличии" : "Нет"}
            </span>
          </div>

          {/* Wishlist — та же высота h-7 */}
          <WishlistButton
            size="sm"
            item={{ id, slug, name, category, images, saleUnit, variants }}
          />
        </div>

        {/* Hover overlay с кнопкой "Подробнее" */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
          <span className="bg-white/95 dark:bg-neutral-900/95 text-foreground text-xs font-semibold px-4 py-2 rounded-xl shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            Подробнее →
          </span>
        </div>
      </Link>

      {/* ── Контент ── */}
      <div className="p-3 sm:p-4">
        {/* Категория */}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">{category}</p>

        {/* Название */}
        <Link href={`/product/${slug}`}>
          <h3 className="font-display font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2 mb-3">
            {name}
          </h3>
        </Link>

        {/* Размеры-пилюли — кликабельные */}
        {variants.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {shownSizes.map((v) => (
              <button
                key={v.id}
                onClick={(e) => { e.preventDefault(); if (v.inStock) { setSelectedId(v.id); } }}
                disabled={!v.inStock}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-all ${
                  selectedVariant?.id === v.id && v.inStock
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : v.inStock
                    ? "border-border bg-muted text-foreground/70 hover:border-primary/50 hover:bg-primary/5"
                    : "border-border/40 bg-transparent text-muted-foreground/40 line-through cursor-not-allowed"
                }`}
              >
                {v.size}
              </button>
            ))}
            {extraCount > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); setShowAllSizes(true); }}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors active:scale-95"
              >
                +{extraCount}
              </button>
            )}
          </div>
        )}

        {/* Кнопка / степпер */}
        <div className="pt-3 border-t border-border/60">
          {cartQty > 0 ? (
            /* ── Степпер количества ── */
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrement}
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-muted hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-all active:scale-90"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 text-center">
                <span className="font-display font-bold text-base tabular-nums">{cartQty}</span>
                <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
              </div>

              <button
                onClick={handleIncrement}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-90 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* ── Добавить в корзину ── */
            <button
              onClick={handleAdd}
              disabled={!hasStock}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
                !hasStock
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-primary/30 hover:shadow-md"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="flex items-baseline gap-0.5 whitespace-nowrap">
                {selectedPrice ? (
                  <>
                    <span className="font-display font-bold text-sm">{formatPrice(selectedPrice)}</span>
                    <span className="text-[10px] opacity-80">/ {unit}</span>
                  </>
                ) : (
                  <span className="text-sm">В корзину</span>
                )}
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
