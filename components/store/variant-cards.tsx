"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { flyToCart } from "@/lib/cart-fly";
import { getPurchasableQuantityLimit, isProductVariantPurchasable } from "@/lib/product-availability";
import { getUnitLabel, getVariantUnitPrice, pickVariantUnit, type ProductUnitType } from "@/lib/product-units";

interface Variant {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  pricePerSquareMeter: number | null;
  piecesPerCube: number | null;
  inStock: boolean;
  stockQty?: number | null;
  lowStockThreshold?: number | null;
}

interface VariantCardsProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  saleUnit: string;
  variants: Variant[];
}

type PurchaseUnit = ProductUnitType;

function getVariantPurchaseOption(variant: Variant, saleUnit: string) {
  const preferredUnit: PurchaseUnit | null = pickVariantUnit(variant, saleUnit);
  if (!preferredUnit) return null;

  const price = getVariantUnitPrice(variant, preferredUnit);
  if (!price) return null;

  return {
    unitType: preferredUnit,
    price,
    unitLabel: getUnitLabel(preferredUnit),
    maxQuantity: getPurchasableQuantityLimit(variant, preferredUnit),
  };
}

export function VariantCards({
  productId,
  productName,
  productSlug,
  productImage,
  saleUnit,
  variants,
}: VariantCardsProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [query, setQuery] = useState("");
  const visibleVariants = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return variants;
    return variants.filter((variant) =>
      [
        variant.size,
        variant.pricePerCube?.toString() || "",
        variant.pricePerPiece?.toString() || "",
        variant.pricePerSquareMeter?.toString() || "",
      ].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query, variants]);

  const handleAdd = (e: React.MouseEvent<HTMLDivElement>, v: Variant) => {
    if (!isProductVariantPurchasable(v)) return;

    const option = getVariantPurchaseOption(v, saleUnit);
    if (!option) return;

    flyToCart(e.currentTarget, productImage ?? null);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }

    addItem({
      variantId: v.id,
      productId,
      productName,
      productSlug,
      variantSize: v.size,
      productImage,
      unitType: option.unitType,
      quantity: 1,
      price: option.price,
      maxQuantity: option.maxQuantity,
    });
  };

  return (
    <div className="space-y-3">
      {variants.length > 12 && (
        <label className="relative block">
          <span className="sr-only">Найти вариант товара</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Быстро найти размер, длину или сорт..."
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {visibleVariants.map((v) => {
        const option = getVariantPurchaseOption(v, saleUnit);
        const isPurchasable = isProductVariantPurchasable(v);

        return (
          <div
            key={v.id}
            onClick={(e) => handleAdd(e, v)}
            className={`relative rounded-2xl border p-4 transition-all duration-200 group ${
              isPurchasable
                ? "border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md hover:shadow-primary/10 active:scale-95 cursor-pointer"
                : "border-border/40 bg-muted/20 opacity-50 cursor-not-allowed"
            }`}
          >
            {/* Status dot */}
            <div
              className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                isPurchasable ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            />

            {/* Size */}
            <p className="font-mono font-semibold text-sm leading-tight mb-3 pr-4">
              {v.size}
            </p>

            {/* Price */}
            {option ? (
              <div>
                <p className="font-bold text-lg text-primary leading-none">
                  {formatPrice(option.price)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">за {option.unitLabel}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">По запросу</p>
            )}

            {/* Pieces per cube */}
            {v.piecesPerCube && saleUnit !== "PIECE" && (
              <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                {v.piecesPerCube} шт/м³
              </p>
            )}

            {/* Hover cart overlay — only for in-stock */}
            {isPurchasable && (
              <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary drop-shadow"
                >
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
      {visibleVariants.length === 0 && (
        <div className="col-span-full rounded-2xl border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          По такому размеру вариантов нет
        </div>
      )}
      </div>
    </div>
  );
}
