"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, ChevronRight, Minus, Plus, Boxes, Package, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore, type UnitType } from "@/store/cart";
import { cn, formatPrice } from "@/lib/utils";
import { WishlistButton } from "@/components/store/wishlist-button";
import { flyToCart } from "@/lib/cart-fly";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useStoreSettings } from "@/lib/store-settings-context";
import { AdminEditButton } from "@/components/admin/admin-edit-button";

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
  shortDescription?: string | null;
  description?: string | null;
  images: string[];
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  variants: Variant[];
  featured?: boolean;
}

/* Градиент-заглушка когда нет фото */
const FALLBACK_GRADIENT =
  "bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-brand-brown/80 dark:from-amber-950/90 dark:via-amber-900/70 dark:to-brand-brown/90";

function shortCardDescription(description?: string | null) {
  const text = (description || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > 118 ? `${text.slice(0, 115).trim()}...` : text;
}

export function ProductCard({
  id, slug, name, category, shortDescription, description, images, saleUnit, variants, featured,
}: ProductCardProps) {
  const { addItem, updateQuantity, items } = useCartStore();
  const { toast } = useToast();
  const { cardStyle } = useStoreSettings();
  const [imgError, setImgError] = useState(false);

  const activeVariants = variants.filter((v) => v.inStock);
  const hasStock = activeVariants.length > 0;
  const teaser = shortCardDescription(shortDescription || description);

  const defaultVariant = activeVariants[0] || variants[0];

  // ID-based selection — avoids server/client hydration mismatch
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedVariant = selectedId
    ? (variants.find((v) => v.id === selectedId) ?? defaultVariant)
    : defaultVariant;

  // Expand all sizes on "+N" click
  const [showAllSizes, setShowAllSizes] = useState(false);

  // Unit type: catalog cards must add to cart in one tap.
  const defaultUnit: UnitType =
    saleUnit === "PIECE" ? "PIECE" : selectedVariant?.pricePerCube ? "CUBE" : "PIECE";
  const [selectedUnit, setSelectedUnit] = useState<UnitType>(defaultUnit);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const effectiveUnit: UnitType =
    selectedUnit === "CUBE" && !selectedVariant?.pricePerCube && selectedVariant?.pricePerPiece
      ? "PIECE"
      : selectedUnit === "PIECE" && !selectedVariant?.pricePerPiece && selectedVariant?.pricePerCube
      ? "CUBE"
      : selectedUnit;
  const unit = effectiveUnit === "PIECE" ? "шт" : "м³";

  const displayUnit: UnitType = effectiveUnit;
  const displayUnitLabel = displayUnit === "PIECE" ? "шт" : "м³";
  const displayPrice = selectedVariant
    ? Number(displayUnit === "CUBE" ? selectedVariant.pricePerCube : selectedVariant.pricePerPiece) || null
    : null;
  const canSwitchUnit = !!selectedVariant?.pricePerCube && !!selectedVariant?.pricePerPiece;

  // Live quantity from cart store
  const cartItemId = selectedVariant ? `${selectedVariant.id}-${effectiveUnit}` : null;
  const cartQty = cartItemId ? (items.find((i) => i.id === cartItemId)?.quantity ?? 0) : 0;

  // Core add logic — reused by direct add and unit picker
  const doAddToCart = (unit: UnitType, srcEl: HTMLElement) => {
    if (!selectedVariant || !hasStock) return;
    const price = unit === "CUBE" ? selectedVariant.pricePerCube : selectedVariant.pricePerPiece;
    if (!price) return;

    flyToCart(srcEl, images[0] ?? null);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);

    addItem({
      variantId: selectedVariant.id,
      productId: id,
      productName: name,
      productSlug: slug,
      variantSize: selectedVariant.size,
      productImage: images[0],
      unitType: unit,
      quantity: 1,
      price: Number(price),
    });

    // Push-тост — один раз за сессию
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default" &&
      !sessionStorage.getItem(PUSH_TOAST_KEY)
    ) {
      sessionStorage.setItem(PUSH_TOAST_KEY, "1");
      setTimeout(() => {
        toast({
          title: "Товар добавлен в корзину",
          description: "Включить уведомления об изменении цен и акциях?",
          duration: 8000,
          action: (
            <ToastAction
              altText="Включить уведомления"
              onClick={async () => {
                const ok = await enablePushFromToast();
                if (ok) toast({ title: "Уведомления включены", duration: 3000 });
              }}
            >
              Включить
            </ToastAction>
          ),
        });
      }, 1200);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedVariant || !hasStock) return;
    if (canSwitchUnit) {
      setShowUnitPicker((open) => !open);
      return;
    }
    doAddToCart(effectiveUnit, e.currentTarget as HTMLElement);
  };

  const handleUnitPick = (unit: UnitType, e: React.MouseEvent, add = false) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedUnit(unit);
    setShowUnitPicker(false);
    if (add) doAddToCart(unit, e.currentTarget as HTMLElement);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (cartQty === 0) {
      doAddToCart(effectiveUnit, e.currentTarget as HTMLElement);
    } else if (cartItemId) {
      updateQuantity(cartItemId, parseFloat((cartQty + 1).toFixed(1)));
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItemId) return;
    updateQuantity(cartItemId, parseFloat((cartQty - 1).toFixed(1)));
  };

  /* Responsive: mobile → 2 pills (compact), desktop → 3 pills */
  const MOBILE_LIMIT = 2;
  const DESKTOP_LIMIT = 2;
  const shownSizes = showAllSizes ? variants : variants.slice(0, DESKTOP_LIMIT);
  const mobileExtra = showAllSizes ? 0 : Math.max(0, variants.length - MOBILE_LIMIT);
  const desktopExtra = showAllSizes ? 0 : Math.max(0, variants.length - DESKTOP_LIMIT);

  // ── Style helpers ──
  const isMinimal  = cardStyle === "minimal";
  const isShowcase = cardStyle === "showcase";
  const isVivid    = cardStyle === "vivid";
  const isMagazine = cardStyle === "magazine";

  const wrapperClass = isMagazine
    ? "group relative rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/10 transition-shadow duration-200 flex flex-col min-h-[280px]"
    : isMinimal
    ? "group relative overflow-hidden transition-colors duration-200 flex flex-col"
    : isVivid
    ? "group relative rounded-2xl overflow-hidden hover:ring-1 hover:ring-primary/15 transition-colors duration-200 flex flex-col vivid-card"
    : "store-product-card group relative bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/25 transition-colors duration-200 flex flex-col";

  // ── Magazine style — completely different layout ──
  if (isMagazine) {
    return (
      <div className={wrapperClass}>
        <AdminEditButton href={`/admin/products/${id}`} mode="overlay" label="Изменить товар" />
        {/* Full-bleed image */}
        <Link prefetch href={`/product/${slug}`} className="absolute inset-0">
          {images[0] && !imgError ? (
            <Image src={images[0]} alt={name} fill loading="lazy"
              className="object-cover transition-opacity duration-200 group-hover:opacity-95"
              sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 280px" unoptimized
              onError={() => setImgError(true)} />
          ) : (
            <div className={`absolute inset-0 ${FALLBACK_GRADIENT}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        </Link>

        {/* Top badges */}
        <div className="relative z-10 p-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {featured && (
              <span className="inline-flex items-center gap-1 h-6 bg-brand-orange text-white text-[10px] font-bold px-2 rounded-lg shadow-md uppercase tracking-wide">Хит</span>
            )}
            <span className={`store-stock-badge pointer-events-none inline-flex items-center gap-1 h-6 text-[10px] font-semibold px-2 rounded-xl ${hasStock ? "is-in-stock" : "is-out-of-stock"}`}>
              <span className={`store-stock-dot w-1.5 h-1.5 rounded-full shrink-0 ${hasStock ? "" : "opacity-50"}`} />
              {hasStock ? "В наличии" : "Нет"}
            </span>
          </div>
          <WishlistButton size="sm" item={{ id, slug, name, category, images, saleUnit, variants }} />
        </div>

        {/* Bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
          <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">{category}</p>
          <Link prefetch href={`/product/${slug}`}>
            <h3 className="font-display font-semibold text-sm text-white leading-snug line-clamp-2 mb-2 hover:text-white/80 transition-colors">
              {name}
            </h3>
          </Link>
          {teaser && (
            <p className="mb-2 hidden text-[11px] leading-snug text-white/65 sm:line-clamp-2">
              {teaser}
            </p>
          )}

          {/* Sizes */}
          {variants.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {variants.slice(0, 3).map((v) => (
                <button
                  key={v.id}
                  onClick={(e) => {
                    e.preventDefault();
                    if (v.inStock) {
                      setSelectedId(v.id);
                      setSelectedUnit(v.pricePerCube ? "CUBE" : "PIECE");
                      setShowUnitPicker(false);
                    }
                  }}
                  disabled={!v.inStock}
                  className={cn(
                    "store-size-chip is-overlay",
                    selectedVariant?.id === v.id && v.inStock && "is-selected",
                    !v.inStock && "is-disabled"
                  )}
                >
                  {v.size}
                </button>
              ))}
            </div>
          )}

          {/* Cart button */}
          <div className="relative">
            {cartQty > 0 ? (
              <div className="flex items-center gap-2">
                <button onClick={handleDecrement} className="flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90">
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 text-center">
                  <span className="font-display font-bold text-base text-white tabular-nums">{cartQty}</span>
                  <span className="text-[10px] text-white/60 ml-0.5">{unit}</span>
                </div>
                <button onClick={handleIncrement} className="flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-90 shadow-sm">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button onClick={handleAdd} disabled={!hasStock}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all duration-200 active:scale-95 text-sm ${
                  !hasStock ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-primary text-white hover:bg-primary/90 shadow-lg"
                }`}>
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                <span className="store-card-price-wrap">
                  {displayPrice ? (
                    <>
                      <span className="store-card-price">{formatPrice(displayPrice)}</span>
                      <span className="store-card-price-unit">/ {displayUnitLabel}</span>
                    </>
                  ) : <span>В корзину</span>}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <AdminEditButton href={`/admin/products/${id}`} mode="overlay" label="Изменить товар" />
      {/* Vivid animated bg — only shown for vivid style */}
      {isVivid && (
        <div className="absolute inset-0 vivid-bg" aria-hidden />
      )}

      {/* ── Изображение ── */}
      <Link prefetch href={`/product/${slug}`} className="store-product-card-media block relative overflow-hidden" style={{ aspectRatio: "var(--photo-aspect, 3/4)" }}>
        {images[0] && !imgError ? (
          <Image
            src={images[0]}
            alt={name}
            fill
            loading="lazy"
            className="object-cover transition-opacity duration-200 group-hover:opacity-95"
            sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 280px"
            unoptimized
            onError={() => setImgError(true)}
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

        {/* Showcase: gradient overlay + floating price badge */}
        {isShowcase && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent pointer-events-none z-[1]" />
            {displayPrice && (
              <div className="absolute top-2 right-10 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-md">
                {formatPrice(displayPrice)}/{displayUnitLabel}
              </div>
            )}
          </>
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
            <span className={`store-stock-badge pointer-events-none inline-flex items-center gap-1 h-7 text-[10px] font-semibold px-2.5 rounded-xl ${hasStock ? "is-in-stock" : "is-out-of-stock"}`}>
              <span className={`store-stock-dot w-1.5 h-1.5 rounded-full shrink-0 ${hasStock ? "" : "opacity-50"}`} />
              {hasStock ? "В наличии" : "Нет"}
            </span>
          </div>

          {/* Wishlist — та же высота h-7 */}
          <WishlistButton
            size="sm"
            item={{ id, slug, name, category, images, saleUnit, variants }}
          />
        </div>

      </Link>

      {/* ── Контент ── */}
      <div className={`flex flex-1 flex-col p-4 ${isVivid ? "bg-card/95" : ""}`}>
        {/* Категория */}
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">{category}</p>
          {variants.length > 1 && (
            <span className="shrink-0 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {variants.length} разм.
            </span>
          )}
        </div>

        {/* Название */}
        <Link prefetch href={`/product/${slug}`}>
          <h3 className="store-product-card-title mb-3 min-h-[2.35rem] font-display text-[15px] leading-[1.16] transition-colors line-clamp-2 sm:min-h-[2.6rem] sm:text-[18px]">
            {name}
          </h3>
        </Link>

        <p
          aria-hidden={!teaser}
          className={cn(
            "mb-3 hidden min-h-[2.65rem] text-xs leading-relaxed text-muted-foreground sm:line-clamp-2",
            !teaser && "opacity-0"
          )}
        >
          {teaser || "Описание товара"}
        </p>

        {/* Размеры-пилюли — кликабельные */}
        {variants.length > 0 && (
          <div
            className={cn(
              "mb-3 flex flex-wrap content-start gap-1.5",
              !showAllSizes && "min-h-[55px] max-h-[55px] overflow-hidden"
            )}
          >
            {shownSizes.map((v, idx) => (
              <button
                key={v.id}
                onClick={(e) => {
                  e.preventDefault();
                  if (v.inStock) {
                    setSelectedId(v.id);
                    setSelectedUnit(v.pricePerCube ? "CUBE" : "PIECE");
                    setShowUnitPicker(false);
                  }
                }}
                disabled={!v.inStock}
                className={cn(
                  "store-size-chip",
                  idx === DESKTOP_LIMIT - 1 ? "hidden sm:inline-flex" : "inline-flex",
                  selectedVariant?.id === v.id && v.inStock && "is-selected",
                  !v.inStock && "is-disabled"
                )}
              >
                {v.size}
              </button>
            ))}
            {/* Mobile: shows from position 2 onwards */}
            {mobileExtra > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); setShowAllSizes(true); }}
                className="store-size-chip is-extra sm:hidden"
              >
                +{mobileExtra}
              </button>
            )}
            {/* Desktop: shows from position 3 onwards */}
            {desktopExtra > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); setShowAllSizes(true); }}
                className="store-size-chip is-extra hidden sm:inline-flex"
              >
                +{desktopExtra}
              </button>
            )}
          </div>
        )}

        {/* Кнопка / степпер */}
        <div className={`mt-auto relative ${isMinimal ? "pt-2" : "pt-3 border-t border-border/60"}`}>
          {cartQty > 0 ? (
            /* ── Степпер количества ── */
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrement}
                className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-xl border border-border bg-muted hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-all active:scale-90"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 text-center">
                <span className="font-display font-bold text-base tabular-nums">{cartQty}</span>
                <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
              </div>

              <button
                onClick={handleIncrement}
                className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-90 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* ── Добавить в корзину ── */
            <button
              onClick={handleAdd}
              disabled={!hasStock}
              className={`store-card-cta w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
                !hasStock
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  : "bg-primary text-primary-foreground hover:bg-primary/92"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="store-card-price-wrap">
                {displayPrice ? (
                  <>
                    <span className="store-card-price">{formatPrice(displayPrice)}</span>
                    <span className="store-card-price-unit">/ {displayUnitLabel}</span>
                  </>
                ) : (
                  <span className="text-sm">В корзину</span>
                )}
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>
          )}

          <AnimatePresence>
            {showUnitPicker && canSwitchUnit && selectedVariant && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowUnitPicker(false);
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="store-unit-picker absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-border bg-card p-2.5 shadow-xl"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Купить как
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowUnitPicker(false);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="store-unit-picker-grid grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleUnitPick("CUBE", e, true)}
                      className="store-unit-option"
                    >
                      <Boxes className="h-4 w-4" />
                      <span>м³</span>
                      <strong>{formatPrice(Number(selectedVariant.pricePerCube))}</strong>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleUnitPick("PIECE", e, true)}
                      className="store-unit-option"
                    >
                      <Package className="h-4 w-4" />
                      <span>шт</span>
                      <strong>{formatPrice(Number(selectedVariant.pricePerPiece))}</strong>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
