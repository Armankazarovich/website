"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  Boxes,
  ChevronRight,
  Droplets,
  Hammer,
  Layers3,
  Package,
  PackageCheck,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
  type LucideIcon,
  Minus,
  Plus,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore, type UnitType } from "@/store/cart";
import { cn, formatPrice } from "@/lib/utils";
import { WishlistButton } from "@/components/store/wishlist-button";
import { flyToCart } from "@/lib/cart-fly";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useStoreSettings } from "@/lib/store-settings-context";
import { AdminEditButton } from "@/components/admin/admin-edit-button";
import { CompareButton } from "@/components/store/compare-button";
import type { CompareItem } from "@/store/compare";
import { buildProductInsightTags } from "@/lib/product-insights";
import { getProductEditTarget } from "@/lib/public-edit-targets";
import { trackArayMetrikaGoal } from "@/lib/aray-metrika-goals";
import {
  getProductAvailability,
  getPurchasableQuantityLimit,
  isProductVariantPurchasable,
} from "@/lib/product-availability";

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
  stockQty?: number | null;
  lowStockThreshold?: number | null;
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
  cardTags?: string[] | null;
  viewMode?: "grid" | "list";
  featured?: boolean;
}

/* Градиент-заглушка когда нет фото */
const FALLBACK_GRADIENT =
  "bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-brand-brown/80 dark:from-amber-950/90 dark:via-amber-900/70 dark:to-brand-brown/90";

function fallbackCardDescription(name: string, category: string) {
  const value = `${name} ${category}`.toLowerCase();
  if (value.includes("фанер")) return `${name} для строительных, мебельных и отделочных задач.`;
  if (value.includes("плинтус")) return `${name} для аккуратной отделки стен и помещений.`;
  if (value.includes("вагонк")) return `${name} для ровной внутренней и декоративной отделки.`;
  if (value.includes("террас")) return `${name} для настилов, террас и открытых площадок.`;
  if (value.includes("имитац")) return `${name} для выразительной отделки под натуральный брус.`;
  if (value.includes("брус")) return `${name} для прочных каркасных и строительных работ.`;
  if (value.includes("доск")) return `${name} для строительства, отделки и столярных задач.`;
  return `${name} для строительных и отделочных задач.`;
}

function cleanCardDescription(value: string | null | undefined) {
  const text = (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(?:^|\s)(?:Доступн(?:ые|о)\s+(?:\d+\s+)?размер(?:ов|а|ы)?|Размеры)\s*:\s*.*?(?=(?:\s+(?:Категория|Цена|Купить)\b)|$)/gi, " ")
    .replace(/(?:^|\s)Категория\s*:\s*.*?(?=(?:\s+(?:Цена|Доступн|Размеры|Купить)\b)|$)/gi, " ")
    .replace(/(?:^|\s)Цена\s+(?:от|за)?\s*.*?(?=(?:\s+(?:Категория|Доступн|Размеры|Купить)\b)|$)/gi, " ")
    .replace(/^\s*Купить\s+.+?\s+от\s+производителя\s+в\s+[^.]+\.?\s*/i, " ")
    .replace(/\s*(?:\.{2,}|[,;:])\s*$/g, "")
    .replace(/^\s*(?:\.{2,}|[,;:])\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const letterCount = (text.match(/[A-Za-zА-Яа-яЁё]/g) || []).length;
  return letterCount >= 18 ? text : "";
}

function shortCardDescription(
  description: string | null | undefined,
  fallback: { name: string; category: string; backup?: string | null },
) {
  const source =
    [cleanCardDescription(description), cleanCardDescription(fallback.backup)].find(Boolean) ||
    fallbackCardDescription(fallback.name, fallback.category);
  if (!source) return "";
  if (source.length <= 86) return source;
  const clipped = source.slice(0, 86).replace(/\s+\S*$/, "").trim();
  return `${clipped || source.slice(0, 83).trim()}...`;
}

function getInsightIcon(tag: string): LucideIcon {
  const text = tag.toLowerCase();
  if (text.includes("стро") || text.includes("каркас")) return Hammer;
  if (text.includes("сух")) return Droplets;
  if (text.includes("размер")) return Ruler;
  if (text.includes("достав")) return Truck;
  if (text.includes("сорт")) return BadgeCheck;
  if (text.includes("фасад") || text.includes("отдел")) return Layers3;
  if (text.includes("заказ")) return PackageCheck;
  if (text.includes("строг")) return Sparkles;
  return ShieldCheck;
}

function getInsightHint(tag: string) {
  const text = tag.toLowerCase();
  if (text.includes("размер")) return `${tag}: размер можно выбрать прямо в ценовом блоке.`;
  if (text.includes("сух")) return `${tag}: материал готов к более стабильной работе после сушки.`;
  if (text.includes("стро") || text.includes("каркас")) return `${tag}: подходит для строительных задач этого товара.`;
  if (text.includes("достав")) return `${tag}: ориентир по срокам указан для быстрой покупки.`;
  if (text.includes("сорт")) return `${tag}: сортность помогает быстро понять качество позиции.`;
  if (text.includes("заказ")) return `${tag}: позиция доступна по оформлению заказа.`;
  return tag;
}

export function ProductCard({
  id, slug, name, category, shortDescription, description, images, saleUnit, variants, cardTags, viewMode = "grid", featured,
}: ProductCardProps) {
  const { addItem, updateQuantity, items } = useCartStore();
  const { toast } = useToast();
  const { cardStyle } = useStoreSettings();
  const [imgError, setImgError] = useState(false);

  const availability = getProductAvailability(variants);
  const activeVariants = variants.filter(isProductVariantPurchasable);
  const hasStock = availability.isPurchasable;
  const teaser = shortCardDescription(shortDescription, { name, category, backup: description });
  const insightTags = buildProductInsightTags({ name, category, shortDescription, description, saleUnit, variants, cardTags });

  const defaultVariant = activeVariants[0] || variants[0];

  // ID-based selection — avoids server/client hydration mismatch
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedVariant = selectedId
    ? (variants.find((v) => v.id === selectedId) ?? defaultVariant)
    : defaultVariant;

  // Expand all sizes on "+N" click
  // Unit type: catalog cards must add to cart in one tap.
  const defaultUnit: UnitType =
    saleUnit === "PIECE" ? "PIECE" : selectedVariant?.pricePerCube ? "CUBE" : "PIECE";
  const [selectedUnit, setSelectedUnit] = useState<UnitType>(defaultUnit);
  const [cardVariantPickerOpen, setCardVariantPickerOpen] = useState(false);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [sheetQuantity, setSheetQuantity] = useState(1);
  const [portalReady, setPortalReady] = useState(false);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  React.useEffect(() => {
    if (!variantPickerOpen || typeof window === "undefined") return;
    setSheetQuantity(1);

    const media = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = () => {
      if (media.matches) setVariantPickerOpen(false);
    };
    closeOnDesktop();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    media.addEventListener?.("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener?.("change", closeOnDesktop);
    };
  }, [variantPickerOpen]);

  const pickVariant = (variant: Variant, closePicker = false) => {
    if (!isProductVariantPurchasable(variant)) return;
    setSelectedId(variant.id);
    setSelectedUnit((current) => {
      if (current === "PIECE" && variant.pricePerPiece) return "PIECE";
      if (current === "CUBE" && variant.pricePerCube) return "CUBE";
      return variant.pricePerCube ? "CUBE" : "PIECE";
    });
    setCardVariantPickerOpen(false);
    if (closePicker) setVariantPickerOpen(false);
  };

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
  const getUnitLabel = (unitType: UnitType) => (unitType === "PIECE" ? "шт" : "м³");
  const getUnitTitle = (unitType: UnitType) => (unitType === "PIECE" ? "1 шт" : "1 м³");
  const getUnitPrice = (variant: Variant | null | undefined, unitType: UnitType) => {
    if (!variant) return null;
    const rawPrice = unitType === "CUBE" ? variant.pricePerCube : variant.pricePerPiece;
    return Number(rawPrice) || null;
  };
  const getVariantUnitOptions = (variant: Variant) => {
    const options: Array<{ unit: UnitType; label: string; price: number }> = [];
    const cubePrice = getUnitPrice(variant, "CUBE");
    const piecePrice = getUnitPrice(variant, "PIECE");
    if (cubePrice) options.push({ unit: "CUBE", label: getUnitLabel("CUBE"), price: cubePrice });
    if (piecePrice) options.push({ unit: "PIECE", label: getUnitLabel("PIECE"), price: piecePrice });
    return options;
  };
  const formatPiecesPerCube = (value: number | null | undefined) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    return Number.isInteger(number)
      ? number.toLocaleString("ru-RU")
      : number.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  };
  const getUnitCaption = (variant: Variant | null | undefined, unitType: UnitType) => {
    if (unitType === "CUBE") {
      const pieces = formatPiecesPerCube(variant?.piecesPerCube);
      return pieces ? `≈ ${pieces} шт` : "за м³";
    }
    return "за штуку";
  };
  const selectedSheetPrice = getUnitPrice(selectedVariant, effectiveUnit);

  // Live quantity from cart store
  const cartItemId = selectedVariant ? `${selectedVariant.id}-${effectiveUnit}` : null;
  const cartQty = portalReady && cartItemId ? (items.find((i) => i.id === cartItemId)?.quantity ?? 0) : 0;
  const getCartQtyForUnit = (unitType: UnitType) =>
    portalReady && selectedVariant ? (items.find((item) => item.id === `${selectedVariant.id}-${unitType}`)?.quantity ?? 0) : 0;
  const getStockLimitForUnit = (unitType: UnitType) => getPurchasableQuantityLimit(selectedVariant, unitType);
  const getRemainingQuantity = (unitType: UnitType) => {
    const limit = getStockLimitForUnit(unitType);
    return limit === null ? null : Math.max(0, limit - getCartQtyForUnit(unitType));
  };
  const selectedStockLimit = getStockLimitForUnit(effectiveUnit);
  const remainingSheetQuantity = getRemainingQuantity(effectiveUnit);
  const sheetQuantityStep = effectiveUnit === "CUBE" ? 0.1 : 1;
  const selectedSheetQuantity =
    remainingSheetQuantity === null ? sheetQuantity : Math.min(sheetQuantity, remainingSheetQuantity);
  const sheetTotal = selectedSheetPrice ? selectedSheetPrice * selectedSheetQuantity : null;
  const stockLimitReached = selectedStockLimit !== null && cartQty >= selectedStockLimit;

  // Core add logic — reused by direct add and unit picker
  const doAddToCart = (unit: UnitType, srcEl: HTMLElement) => {
    if (!selectedVariant || !isProductVariantPurchasable(selectedVariant)) return;
    const price = unit === "CUBE" ? selectedVariant.pricePerCube : selectedVariant.pricePerPiece;
    if (!price) return;
    const maxQuantity = getStockLimitForUnit(unit);
    const currentCartQty = getCartQtyForUnit(unit);
    const quantityToAdd = maxQuantity === null ? 1 : Math.min(1, Math.max(0, maxQuantity - currentCartQty));
    if (quantityToAdd <= 0) return;

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
      quantity: quantityToAdd,
      price: Number(price),
      maxQuantity,
    });
    trackArayMetrikaGoal("aray_cart_add", {
      source: "catalog_card",
      productId: id,
      variantId: selectedVariant.id,
      productName: name,
      variantSize: selectedVariant.size,
      unit,
      quantity: quantityToAdd,
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
    e.stopPropagation();
    if (!selectedVariant || !isProductVariantPurchasable(selectedVariant)) return;
    if (canSwitchUnit) {
      doAddToCart(effectiveUnit, e.currentTarget as HTMLElement);
      return;
    }
    doAddToCart(effectiveUnit, e.currentTarget as HTMLElement);
  };

  const handleCardSizeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
      setCardVariantPickerOpen(false);
      setVariantPickerOpen(true);
      return;
    }
    setCardVariantPickerOpen((open) => !open);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartQty === 0) {
      doAddToCart(effectiveUnit, e.currentTarget as HTMLElement);
    } else if (cartItemId) {
      const nextQty = parseFloat((cartQty + 1).toFixed(1));
      updateQuantity(cartItemId, selectedStockLimit === null ? nextQty : Math.min(nextQty, selectedStockLimit));
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItemId) return;
    updateQuantity(cartItemId, parseFloat((cartQty - 1).toFixed(1)));
  };

  const handleSheetAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedVariant || !isProductVariantPurchasable(selectedVariant) || !selectedSheetPrice || selectedSheetQuantity <= 0) return;

    flyToCart(e.currentTarget, images[0] ?? null);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);

    addItem({
      variantId: selectedVariant.id,
      productId: id,
      productName: name,
      productSlug: slug,
      variantSize: selectedVariant.size,
      productImage: images[0],
      unitType: effectiveUnit,
      quantity: selectedSheetQuantity,
      price: Number(selectedSheetPrice),
      maxQuantity: selectedStockLimit,
    });
    trackArayMetrikaGoal("aray_cart_add", {
      source: "catalog_size_sheet",
      productId: id,
      variantId: selectedVariant.id,
      productName: name,
      variantSize: selectedVariant.size,
      unit: effectiveUnit,
      quantity: selectedSheetQuantity,
      price: Number(selectedSheetPrice),
    });

    setVariantPickerOpen(false);
  };

  // ── Style helpers ──
  const isMinimal  = cardStyle === "minimal";
  const isShowcase = cardStyle === "showcase";
  const isVivid    = cardStyle === "vivid";
  const isMagazine = cardStyle === "magazine";
  const isListView = viewMode === "list" && !isMagazine;
  const productEditTarget = getProductEditTarget(id);
  const compareItem: CompareItem = {
    id,
    slug,
    name,
    category,
    shortDescription,
    description,
    images,
    cardTags,
    saleUnit,
    variants,
  };

  const wrapperClass = cn(
    isMagazine
      ? "group relative rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/10 transition-shadow duration-200 flex flex-col min-h-[280px]"
      : isMinimal
      ? "group relative overflow-hidden transition-colors duration-200 flex flex-col"
      : isVivid
      ? "group relative rounded-2xl overflow-hidden hover:ring-1 hover:ring-primary/15 transition-colors duration-200 flex flex-col vivid-card"
      : "store-product-card group relative bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/25 transition-colors duration-200 flex flex-col",
    isListView && "store-product-card-list"
  );

  // ── Magazine style — completely different layout ──
  if (isMagazine) {
    return (
      <div className={wrapperClass}>
        <AdminEditButton href={productEditTarget.adminHref} mode="overlay" label={productEditTarget.adminLabel} />
        {/* Full-bleed image */}
        <Link prefetch={false} href={`/product/${slug}`} className="absolute inset-0">
          {images[0] && !imgError ? (
            <Image src={images[0]} alt={name} fill loading="lazy"
              className="object-cover transition-opacity duration-200 group-hover:opacity-95"
              sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 280px"
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
            <span className={`store-stock-badge pointer-events-none inline-flex items-center gap-1 h-6 text-[10px] font-semibold px-2 rounded-xl ${availability.className}`}>
              <span className="store-stock-dot w-1.5 h-1.5 rounded-full shrink-0" />
              {availability.label}
            </span>
          </div>
          <div className="store-action-cluster">
            <CompareButton size="sm" item={compareItem} />
            <WishlistButton size="sm" item={compareItem} />
          </div>
        </div>

        {/* Bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
          <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">{category}</p>
          <Link prefetch={false} href={`/product/${slug}`}>
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
                    pickVariant(v);
                  }}
                  disabled={!isProductVariantPurchasable(v)}
                  className={cn(
                    "store-size-chip is-overlay",
                    selectedVariant?.id === v.id && isProductVariantPurchasable(v) && "is-selected",
                    !isProductVariantPurchasable(v) && "is-disabled"
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
                <button data-store-card-cart-decrement onClick={handleDecrement} className="flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-xl border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground transition-all hover:bg-primary-foreground/20 active:scale-90">
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 text-center">
                  <span data-store-card-cart-quantity className="font-display text-base font-bold tabular-nums text-primary-foreground">{cartQty}</span>
                  <span className="ml-0.5 text-[10px] text-primary-foreground/60">{unit}</span>
                </div>
                <button data-store-card-cart-increment onClick={handleIncrement} disabled={stockLimitReached} className="flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-45">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button data-add-to-cart onClick={handleAdd} disabled={!hasStock}
                className={`store-card-cta w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all duration-200 active:scale-95 text-sm ${
                  !hasStock ? "cursor-not-allowed bg-card/25 text-muted-foreground" : "bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
                }`}>
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                <span className="store-card-price-wrap">
                  {!hasStock ? (
                    <span>{availability.label}</span>
                  ) : displayPrice ? (
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
      <AdminEditButton href={productEditTarget.adminHref} mode="overlay" label={productEditTarget.adminLabel} />
      {/* Vivid animated bg — only shown for vivid style */}
      {isVivid && (
        <div className="absolute inset-0 vivid-bg" aria-hidden />
      )}

      {/* ── Изображение ── */}
      <Link prefetch={false} href={`/product/${slug}`} className="store-product-card-media block relative overflow-hidden" style={{ aspectRatio: "var(--catalog-card-photo-aspect, var(--photo-aspect, 3/4))" }}>
        {images[0] && !imgError ? (
          <Image
            src={images[0]}
            alt={name}
            fill
            loading="lazy"
            className="object-cover transition-opacity duration-200 group-hover:opacity-95"
            sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 280px"
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
            {hasStock && displayPrice && (
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
            <span className={`store-stock-badge pointer-events-none inline-flex items-center gap-1 h-7 text-[10px] font-semibold px-2.5 rounded-xl ${availability.className}`}>
              <span className="store-stock-dot w-1.5 h-1.5 rounded-full shrink-0" />
              {availability.label}
            </span>
          </div>

          {/* Wishlist — та же высота h-7 */}
          <div className="store-action-cluster">
            <CompareButton size="sm" item={compareItem} />
            <WishlistButton
              size="sm"
              item={compareItem}
            />
          </div>
        </div>

      </Link>

      {/* ── Контент ── */}
      <div className={`store-card-content flex flex-1 flex-col p-3 sm:p-4 ${isVivid ? "bg-card/95" : ""}`}>
        {/* Категория */}
        <div className="store-card-meta mb-2">
          <p className="store-card-category truncate">{category}</p>
          {variants.length > 1 && (
            <span className="store-card-variant-count">
              {variants.length} разм.
            </span>
          )}
        </div>

        {/* Название */}
        <Link prefetch={false} href={`/product/${slug}`}>
          <h3
            title={name}
            className="store-product-card-title mb-1 min-h-[1.9rem] font-display text-[15px] leading-[1.16] transition-colors line-clamp-2 sm:min-h-[2.1rem] sm:text-[18px]"
          >
            {name}
          </h3>
        </Link>

        <p
          aria-hidden={!teaser}
          className={cn(
            "store-card-teaser store-card-teaser-under-title mb-3 min-h-[2.75rem] text-xs leading-relaxed text-muted-foreground line-clamp-2",
            !teaser && "opacity-0"
          )}
        >
          {teaser || "Описание товара"}
        </p>

        <div className="store-smart-tags mb-3" aria-label="Преимущества товара">
          {insightTags.map((tag) => {
            const Icon = getInsightIcon(tag);
            return (
              <span
                key={tag}
                className="store-smart-tag"
                tabIndex={0}
                aria-label={getInsightHint(tag)}
              >
                <Icon className="store-smart-tag-icon" strokeWidth={2.2} aria-hidden="true" />
                <span className="store-smart-tag-label">{tag}</span>
              </span>
            );
          })}
        </div>

        {/* Кнопка / степпер */}
        <div className={`store-card-buy-zone mt-auto relative ${isMinimal ? "pt-2" : "pt-3"}`}>
          {hasStock && displayPrice && (
            <div className="store-card-price-panel store-card-price-panel-inline store-card-price-panel-cta" aria-label="Цена и единица покупки">
              {selectedVariant && (
                variants.length > 1 ? (
                  <button
                    type="button"
                    className="store-card-price-size-row store-card-price-size-button"
                    aria-haspopup="dialog"
                    aria-expanded={cardVariantPickerOpen || variantPickerOpen}
                    aria-label="Выбрать размер"
                    onClick={handleCardSizeClick}
                  >
                    <span className="store-card-price-size-label">Размер</span>
                    <span className="store-card-price-size">
                      <span>{selectedVariant.size}</span>
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </button>
                ) : (
                  <div className="store-card-price-size-row">
                    <span className="store-card-price-size-label">Размер</span>
                    <span className="store-card-price-size">{selectedVariant.size}</span>
                  </div>
                )
              )}

              <div className="store-card-price-body">
                <div className="store-card-price-main">
                  <span className="store-card-price-kicker">Цена за {getUnitTitle(displayUnit)}</span>
                  <strong>{formatPrice(displayPrice)}</strong>
                  <small>{getUnitCaption(selectedVariant, effectiveUnit)}</small>
                </div>

                <div className="store-card-price-side">
                  {canSwitchUnit && selectedVariant ? (
                    <div className="store-card-unit-switch" aria-label="Единица цены">
                      {getVariantUnitOptions(selectedVariant).map((option) => (
                        <button
                          key={option.unit}
                          type="button"
                          title={`Цена за ${getUnitTitle(option.unit)}: ${formatPrice(option.price)}`}
                          aria-pressed={effectiveUnit === option.unit}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedUnit(option.unit);
                          }}
                          className={cn(
                            "store-card-unit-toggle",
                            effectiveUnit === option.unit && "is-selected",
                          )}
                        >
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="store-card-unit-chip">{displayUnitLabel}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {cardVariantPickerOpen && variants.length > 1 && (
              <motion.div
                role="dialog"
                aria-label="Выбор размера"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="store-card-variant-popover"
              >
                <div className="store-card-variant-head">
                  <div className="store-card-variant-head-copy">
                    <span>Выберите размер</span>
                    <small>Цена за {getUnitTitle(displayUnit)}</small>
                  </div>
                  <strong>{variants.length} разм.</strong>
                  <button
                    type="button"
                    aria-label="Закрыть выбор размера"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCardVariantPickerOpen(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="store-card-variant-grid">
                  {variants.map((variant) => {
                    const selected = selectedVariant?.id === variant.id;
                    const fallbackUnit: UnitType = effectiveUnit === "CUBE" ? "PIECE" : "CUBE";
                    const primaryPrice = getUnitPrice(variant, effectiveUnit);
                    const fallbackPrice = getUnitPrice(variant, fallbackUnit);
                    const priceInfo = primaryPrice
                      ? { price: primaryPrice, label: getUnitLabel(effectiveUnit), unit: effectiveUnit }
                      : fallbackPrice
                      ? { price: fallbackPrice, label: getUnitLabel(fallbackUnit), unit: fallbackUnit }
                      : null;

                    return (
                      <button
                        key={`card-picker-${variant.id}`}
                        type="button"
                        title={variant.size}
                        disabled={!isProductVariantPurchasable(variant) || !priceInfo}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          pickVariant(variant);
                        }}
                        className={cn(
                          "store-card-variant-option",
                          selected && isProductVariantPurchasable(variant) && "is-selected",
                          (!isProductVariantPurchasable(variant) || !priceInfo) && "is-disabled",
                        )}
                      >
                        <span className="store-card-variant-size">{variant.size}</span>
                        {priceInfo && (
                          <span className="store-card-variant-price">
                            {formatPrice(priceInfo.price)}
                            <small>/{priceInfo.label}</small>
                          </span>
                        )}
                        {priceInfo?.unit === "CUBE" && (
                          <small className="store-card-variant-caption">{getUnitCaption(variant, "CUBE")}</small>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {cartQty > 0 ? (
            /* ── Степпер количества ── */
            <div className="flex items-center gap-2">
              <button
                data-store-card-cart-decrement
                onClick={handleDecrement}
                className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-xl border border-border bg-muted hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-all active:scale-90"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 text-center">
                <span data-store-card-cart-quantity className="font-display font-bold text-base tabular-nums">{cartQty}</span>
                <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
              </div>

              <button
                data-store-card-cart-increment
                onClick={handleIncrement}
                disabled={stockLimitReached}
                className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* ── Добавить в корзину ── */
            <button
              data-add-to-cart
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
                <span className="text-sm">{hasStock ? "В корзину" : availability.label}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>
          )}

        </div>
      </div>
      {portalReady
        ? createPortal(
            <AnimatePresence>
              {variantPickerOpen && (
                <>
                  <motion.button
                    type="button"
                    aria-label="Закрыть выбор размера"
                    className="store-variant-sheet-backdrop fixed inset-0 z-[65] sm:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setVariantPickerOpen(false);
                    }}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Выбор размера"
                    className="store-variant-sheet fixed inset-x-0 bottom-0 z-[70] mx-auto w-full px-4 pt-3 sm:hidden"
                    style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
                    initial={{ y: "100%", opacity: 0.95 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0.95 }}
                    transition={{ type: "spring", damping: 30, stiffness: 360 }}
                  >
                    <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-foreground/18" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
                          Размер товара
                        </p>
                        <h4 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-foreground">
                          {name}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setVariantPickerOpen(false);
                        }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/70 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Закрыть"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="store-variant-section-label mt-3">
                      <span>Размер</span>
                      <strong>{variants.length}</strong>
                    </div>

                    <div className="store-variant-sheet-grid mt-2 grid grid-cols-2 gap-2 overflow-y-auto pr-1">
                      {variants.map((variant) => {
                        const selected = selectedVariant?.id === variant.id;
                        const fallbackUnit: UnitType = effectiveUnit === "CUBE" ? "PIECE" : "CUBE";
                        const primaryPrice = getUnitPrice(variant, effectiveUnit);
                        const fallbackPrice = getUnitPrice(variant, fallbackUnit);
                        const priceInfo = primaryPrice
                          ? { price: primaryPrice, label: getUnitLabel(effectiveUnit) }
                          : fallbackPrice
                          ? { price: fallbackPrice, label: getUnitLabel(fallbackUnit) }
                          : null;

                        return (
                          <button
                            key={`picker-${variant.id}`}
                            type="button"
                            title={variant.size}
                            disabled={!isProductVariantPurchasable(variant)}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              pickVariant(variant, false);
                            }}
                            className={cn(
                              "store-variant-option",
                              selected && isProductVariantPurchasable(variant) && "is-selected",
                              !isProductVariantPurchasable(variant) && "is-disabled",
                            )}
                          >
                            <span className="store-variant-option-size">{variant.size}</span>
                            {priceInfo && (
                              <span className="store-variant-option-prices">
                                <span className={cn("store-variant-option-price", selected && "is-active")}>
                                  {formatPrice(priceInfo.price)} / {priceInfo.label}
                                </span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {canSwitchUnit && selectedVariant && (
                      <>
                        <div className="store-variant-section-label mt-3">
                          <span>Единица</span>
                        </div>
                        <div className="store-variant-unit-choice mt-2 grid grid-cols-2 gap-2">
                          {getVariantUnitOptions(selectedVariant).map((option) => (
                            <button
                              key={option.unit}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedUnit(option.unit);
                              }}
                              className={cn(
                                "store-variant-unit-option",
                                effectiveUnit === option.unit && "is-selected",
                              )}
                            >
                              {option.unit === "CUBE" ? (
                                <Boxes className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Package className="h-4 w-4" aria-hidden="true" />
                              )}
                              <span className="store-variant-unit-copy">
                                <span className="store-variant-unit-label">{option.label}</span>
                                <strong>{formatPrice(option.price)}</strong>
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="store-variant-sheet-buy mt-3">
                      {selectedSheetPrice && (
                        <div className="store-variant-price-summary">
                          <div className="store-variant-price-row">
                            <span>Цена за {getUnitTitle(effectiveUnit)}</span>
                            <strong>{formatPrice(selectedSheetPrice)}</strong>
                          </div>
                          <div className="store-variant-price-row">
                            <span>Количество</span>
                            <strong>
                              {selectedSheetQuantity} {getUnitLabel(effectiveUnit)}
                            </strong>
                          </div>
                          <div className="store-variant-price-row is-total">
                            <span>Итого</span>
                            <strong>{formatPrice(sheetTotal ?? selectedSheetPrice)}</strong>
                          </div>
                        </div>
                      )}

                      <div className="store-variant-buy-row">
                        <div className="store-variant-quantity" aria-label="Количество">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSheetQuantity((value) => Math.max(sheetQuantityStep, Number((value - sheetQuantityStep).toFixed(1))));
                            }}
                            aria-label="Уменьшить количество"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span>
                            <strong>{selectedSheetQuantity}</strong>
                            <small>{getUnitLabel(effectiveUnit)}</small>
                          </span>
                          <button
                            type="button"
                            disabled={remainingSheetQuantity !== null && selectedSheetQuantity >= remainingSheetQuantity}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSheetQuantity((value) => {
                                const nextValue = Number((value + sheetQuantityStep).toFixed(1));
                                return remainingSheetQuantity === null
                                  ? nextValue
                                  : Math.min(nextValue, remainingSheetQuantity);
                              });
                            }}
                            aria-label="Увеличить количество"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSheetAdd}
                          disabled={!selectedVariant || !isProductVariantPurchasable(selectedVariant) || !selectedSheetPrice || selectedSheetQuantity <= 0}
                          className="store-variant-sheet-done flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">Добавить</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
