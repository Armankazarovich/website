"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Minus, Plus, ShoppingCart, Phone, Check, Search } from "lucide-react";
import { useCartStore, type UnitType } from "@/store/cart";
import { PHONE_LINK } from "@/lib/phone-constants";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { flyToCart } from "@/lib/cart-fly";
import { haptic } from "@/lib/haptic";
import { trackArayMetrikaGoal } from "@/lib/aray-metrika-goals";
import {
  clampProductQuantity,
  getPurchasableQuantityLimit,
  isProductVariantPurchasable,
} from "@/lib/product-availability";

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

interface VariantSelectorProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  variants: Variant[];
  phoneLink?: string;
}

function getVariantUnitPrice(variant: Variant | null | undefined, unitType: UnitType) {
  if (!variant) return null;
  const price = Number(unitType === "CUBE" ? variant.pricePerCube : variant.pricePerPiece);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function getPreferredUnit(
  variant: Variant | null | undefined,
  saleUnit: "CUBE" | "PIECE" | "BOTH",
  currentUnit?: UnitType,
): UnitType | null {
  const hasCube = Boolean(getVariantUnitPrice(variant, "CUBE"));
  const hasPiece = Boolean(getVariantUnitPrice(variant, "PIECE"));
  if (currentUnit === "CUBE" && hasCube) return "CUBE";
  if (currentUnit === "PIECE" && hasPiece) return "PIECE";
  if (saleUnit === "CUBE") return hasCube ? "CUBE" : null;
  if (saleUnit === "PIECE") return hasPiece ? "PIECE" : null;
  if (hasCube) return "CUBE";
  if (hasPiece) return "PIECE";
  return null;
}

function quantityStep(unitType: UnitType) {
  return unitType === "CUBE" ? 0.1 : 1;
}

function normalizeQuantityForUnit(
  value: number,
  unitType: UnitType,
  variant: Variant | null | undefined,
) {
  const step = quantityStep(unitType);
  const safe = Number.isFinite(value) ? value : step;
  const rounded = unitType === "CUBE" ? Number(safe.toFixed(1)) : Math.round(safe);
  const clamped = clampProductQuantity(rounded, variant, unitType);
  const limit = getPurchasableQuantityLimit(variant, unitType);
  if (limit !== null && limit < step) return limit;
  return Math.max(step, clamped);
}

export function VariantSelector({
  productId, productName, productSlug, productImage, saleUnit, variants, phoneLink,
}: VariantSelectorProps) {
  const effectivePhone = phoneLink || PHONE_LINK;
  const { addItem } = useCartStore();
  const initialVariant =
    variants.find((variant) => isProductVariantPurchasable(variant) && getPreferredUnit(variant, saleUnit)) ||
    variants[0] ||
    null;

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    initialVariant
  );
  const [unitType, setUnitType] = useState<UnitType>(
    getPreferredUnit(initialVariant, saleUnit) || (saleUnit === "PIECE" ? "PIECE" : "CUBE")
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [addedTotal, setAddedTotal] = useState(0);
  const [variantQuery, setVariantQuery] = useState("");
  const justAddedTimer = useRef<ReturnType<typeof setTimeout>>();

  // Sync unit type with saleUnit and selected size.
  useEffect(() => {
    const preferred = getPreferredUnit(selectedVariant, saleUnit, unitType);
    if (!preferred) return;
    if (preferred !== unitType) {
      setUnitType(preferred);
      setQuantity(normalizeQuantityForUnit(1, preferred, selectedVariant));
      return;
    }
    setQuantity((value) => normalizeQuantityForUnit(value, preferred, selectedVariant));
  }, [saleUnit, selectedVariant, unitType]);

  const currentPrice = getVariantUnitPrice(selectedVariant, unitType);
  const maxQuantity = getPurchasableQuantityLimit(selectedVariant, unitType);
  const canUseCube = Boolean(getVariantUnitPrice(selectedVariant, "CUBE"));
  const canUsePiece = Boolean(getVariantUnitPrice(selectedVariant, "PIECE"));

  const totalPrice = currentPrice ? currentPrice * quantity : 0;
  const visibleVariants = useMemo(() => {
    const query = variantQuery.trim().toLowerCase();
    if (!query) return variants;
    return variants.filter((variant) =>
      [
        variant.size,
        variant.pricePerCube?.toString() || "",
        variant.pricePerPiece?.toString() || "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [variantQuery, variants]);

  // Calculate equivalent in other unit
  const equivalentInfo = () => {
    if (!selectedVariant || !selectedVariant.piecesPerCube) return null;
    if (unitType === "CUBE") {
      const pieces = Math.round(quantity * selectedVariant.piecesPerCube);
      return `≈ ${pieces} шт`;
    } else {
      const cubes = (quantity / selectedVariant.piecesPerCube).toFixed(2);
      return `≈ ${cubes} м³`;
    }
  };

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!selectedVariant || !isProductVariantPurchasable(selectedVariant) || !currentPrice) return;
    const safeQuantity = normalizeQuantityForUnit(quantity, unitType, selectedVariant);
    if (safeQuantity <= 0) return;

    flyToCart(e.currentTarget, productImage ?? null);
    haptic("success"); // двойной пульс — подтверждение добавления

    addItem({
      variantId: selectedVariant.id,
      productId,
      productName,
      productSlug,
      variantSize: selectedVariant.size,
      productImage,
      unitType,
      quantity: safeQuantity,
      price: Number(currentPrice),
      maxQuantity,
    });
    trackArayMetrikaGoal("aray_cart_add", {
      source: "product_page",
      productId,
      variantId: selectedVariant.id,
      productName,
      variantSize: selectedVariant.size,
      unit: unitType,
      quantity: safeQuantity,
      price: Number(currentPrice),
    });

    // Show confirmation state
    setAddedTotal(safeQuantity * Number(currentPrice));
    setQuantity(safeQuantity);
    setJustAdded(true);
    clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAdded(false), 2500);
  };

  const adjustQty = (delta: number) => {
    const step = quantityStep(unitType);
    setQuantity((value) => normalizeQuantityForUnit(value + delta * step, unitType, selectedVariant));
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {/* Size selection */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-medium">
              Выберите размер
              {selectedVariant && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedVariant.size}
                </span>
              )}
            </h3>
            {variants.length > 10 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {variants.length} вариантов: можно быстро найти размер или сорт.
              </p>
            )}
          </div>
        </div>
        {variants.length > 10 && (
          <label className="relative mb-3 block">
            <span className="sr-only">Найти размер</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={variantQuery}
              onChange={(event) => setVariantQuery(event.target.value)}
              placeholder="Найти размер, длину или сорт..."
              className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </label>
        )}
        <div
          className={cn(
            variants.length > 10
              ? "grid grid-cols-2 gap-2 overflow-visible sm:max-h-64 sm:grid-cols-3 sm:overflow-y-auto sm:pr-1"
              : "flex flex-wrap gap-2",
          )}
        >
          {visibleVariants.map((v) => {
            const hasSaleUnit = Boolean(getPreferredUnit(v, saleUnit));
            const disabled = !isProductVariantPurchasable(v) || !hasSaleUnit;

            return (
            <button
              key={v.id}
              onClick={() => setSelectedVariant(v)}
              disabled={disabled}
              className={cn(
                "px-4 py-3 sm:py-1.5 rounded-lg border text-sm font-medium transition-all",
                selectedVariant?.id === v.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50",
                disabled && "opacity-40 cursor-not-allowed line-through"
              )}
            >
              {v.size}
            </button>
          );
          })}
          {visibleVariants.length === 0 && (
            <p className="col-span-full rounded-xl border border-border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              Такого размера не нашли
            </p>
          )}
        </div>
      </div>

      {/* Unit type toggle (only if BOTH) */}
      {saleUnit === "BOTH" && (
        <div>
          <h3 className="font-medium mb-3">Единица измерения</h3>
          <div className="inline-flex rounded-xl border border-border p-1 bg-muted">
            <button
              onClick={() => { setUnitType("CUBE"); setQuantity(normalizeQuantityForUnit(1, "CUBE", selectedVariant)); }}
              disabled={!canUseCube}
              className={cn(
                "px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all",
                unitType === "CUBE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                !canUseCube && "pointer-events-none opacity-40"
              )}
            >
              м³ (куб)
            </button>
            <button
              onClick={() => { setUnitType("PIECE"); setQuantity(normalizeQuantityForUnit(1, "PIECE", selectedVariant)); }}
              disabled={!canUsePiece}
              className={cn(
                "px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all",
                unitType === "PIECE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                !canUsePiece && "pointer-events-none opacity-40"
              )}
            >
              шт (штука)
            </button>
          </div>
        </div>
      )}

      {/* Price display */}
      {currentPrice && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Цена за {unitType === "CUBE" ? "1 м³" : "1 шт"}
              </p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-primary">
                {formatPrice(Number(currentPrice))}
              </p>
            </div>
            {totalPrice > 0 && quantity !== 1 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Итого за {quantity} {unitType === "CUBE" ? "м³" : "шт"}</p>
                <p className="text-2xl font-display font-bold">{formatPrice(totalPrice)}</p>
              </div>
            )}
          </div>
          {equivalentInfo() && (
            <p className="text-xs text-muted-foreground mt-1">{equivalentInfo()}</p>
          )}
        </div>
      )}

      {/* Quantity */}
      <div>
        <h3 className="font-medium mb-3">
          Количество ({unitType === "CUBE" ? "м³" : "шт"})
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => adjustQty(-1)}
              className="px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0) setQuantity(normalizeQuantityForUnit(v, unitType, selectedVariant));
              }}
              className="w-20 text-center text-base py-3 bg-background border-x border-border font-medium focus:outline-none"
              step={unitType === "CUBE" ? "0.1" : "1"}
              min={unitType === "CUBE" ? "0.1" : "1"}
            />
            <button
              onClick={() => adjustQty(1)}
              disabled={maxQuantity !== null && quantity >= maxQuantity}
              className="px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {totalPrice > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Сумма</p>
              <p className="font-bold text-lg">{formatPrice(totalPrice)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add to cart */}
      <div className="flex gap-3">
        <Button
          size="lg"
          className={cn(
            "flex-1 text-base font-semibold transition-all duration-300",
            justAdded
              ? "bg-primary hover:bg-primary border-primary scale-[1.02] shadow-[0_0_20px_hsl(var(--primary)/0.40)]"
              : ""
          )}
          onClick={handleAdd}
          disabled={!selectedVariant || !isProductVariantPurchasable(selectedVariant) || !currentPrice || justAdded}
        >
          {justAdded ? (
            <span className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <Check className="w-5 h-5 shrink-0" />
              <span className="truncate">
                {quantity} {unitType === "CUBE" ? "м³" : "шт"} · {formatPrice(addedTotal)}
              </span>
            </span>
          ) : !selectedVariant || !isProductVariantPurchasable(selectedVariant) ? (
            "Нет в наличии"
          ) : (
            <>
              <ShoppingCart className="w-5 h-5 mr-2" />
              В корзину
            </>
          )}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href={`tel:${effectivePhone}`}>
            <Phone className="w-5 h-5" />
          </a>
        </Button>
      </div>

      {(!selectedVariant || !isProductVariantPurchasable(selectedVariant)) && (
        <p className="text-sm text-muted-foreground text-center">
          Этот размер временно отсутствует.{" "}
          <a href={`tel:${effectivePhone}`} className="text-primary hover:underline">
            Позвоните нам
          </a>{" "}
          для уточнения сроков поставки.
        </p>
      )}
    </div>
  );
}
