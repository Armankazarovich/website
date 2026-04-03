"use client";

import React, { useState, useEffect, useRef } from "react";
import { Minus, Plus, ShoppingCart, Phone, Check } from "lucide-react";
import { useCartStore, type UnitType } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { flyToCart } from "@/lib/cart-fly";
import { haptic } from "@/lib/haptic";

interface Variant {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  piecesPerCube: number | null;
  inStock: boolean;
}

interface VariantSelectorProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  variants: Variant[];
}

export function VariantSelector({
  productId, productName, productSlug, productImage, saleUnit, variants,
}: VariantSelectorProps) {
  const { addItem } = useCartStore();

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants.find((v) => v.inStock) || variants[0] || null
  );
  const [unitType, setUnitType] = useState<UnitType>(
    saleUnit === "PIECE" ? "PIECE" : "CUBE"
  );
  const [quantity, setQuantity] = useState(saleUnit === "PIECE" ? 1 : 1);
  const [justAdded, setJustAdded] = useState(false);
  const [addedTotal, setAddedTotal] = useState(0);
  const justAddedTimer = useRef<ReturnType<typeof setTimeout>>();

  // Sync unit type with saleUnit
  useEffect(() => {
    if (saleUnit === "CUBE") setUnitType("CUBE");
    if (saleUnit === "PIECE") setUnitType("PIECE");
  }, [saleUnit]);

  const currentPrice =
    selectedVariant
      ? unitType === "CUBE"
        ? selectedVariant.pricePerCube
        : selectedVariant.pricePerPiece
      : null;

  const totalPrice = currentPrice ? currentPrice * quantity : 0;

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
    if (!selectedVariant || !currentPrice) return;

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
      quantity,
      price: Number(currentPrice),
    });

    // Show confirmation state
    setAddedTotal(quantity * Number(currentPrice));
    setJustAdded(true);
    clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAdded(false), 2500);
  };

  const adjustQty = (delta: number) => {
    const step = unitType === "CUBE" ? 0.1 : 1;
    const newQty = Math.max(step, parseFloat((quantity + delta * step).toFixed(1)));
    setQuantity(newQty);
  };

  return (
    <div className="space-y-6">
      {/* Size selection */}
      <div>
        <h3 className="font-medium mb-3">
          Выберите размер
          {selectedVariant && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {selectedVariant.size}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVariant(v)}
              disabled={!v.inStock}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                selectedVariant?.id === v.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50",
                !v.inStock && "opacity-40 cursor-not-allowed line-through"
              )}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>

      {/* Unit type toggle (only if BOTH) */}
      {saleUnit === "BOTH" && (
        <div>
          <h3 className="font-medium mb-3">Единица измерения</h3>
          <div className="inline-flex rounded-xl border border-border p-1 bg-muted">
            <button
              onClick={() => { setUnitType("CUBE"); setQuantity(1); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                unitType === "CUBE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              м³ (куб)
            </button>
            <button
              onClick={() => { setUnitType("PIECE"); setQuantity(1); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                unitType === "PIECE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
              <p className="text-3xl font-display font-bold text-primary">
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
                if (!isNaN(v) && v > 0) setQuantity(v);
              }}
              className="w-20 text-center py-3 bg-background border-x border-border font-medium focus:outline-none"
              step={unitType === "CUBE" ? "0.1" : "1"}
              min={unitType === "CUBE" ? "0.1" : "1"}
            />
            <button
              onClick={() => adjustQty(1)}
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
              ? "bg-emerald-500 hover:bg-emerald-500 border-emerald-400 scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.40)]"
              : ""
          )}
          onClick={handleAdd}
          disabled={!selectedVariant?.inStock || !currentPrice || justAdded}
        >
          {justAdded ? (
            <span className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <Check className="w-5 h-5 shrink-0" />
              <span className="truncate">
                {quantity} {unitType === "CUBE" ? "м³" : "шт"} · {formatPrice(addedTotal)}
              </span>
            </span>
          ) : !selectedVariant?.inStock ? (
            "Нет в наличии"
          ) : (
            <>
              <ShoppingCart className="w-5 h-5 mr-2" />
              В корзину
            </>
          )}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href="tel:+79859707133">
            <Phone className="w-5 h-5" />
          </a>
        </Button>
      </div>

      {!selectedVariant?.inStock && (
        <p className="text-sm text-muted-foreground text-center">
          Этот размер временно отсутствует.{" "}
          <a href="tel:+79859707133" className="text-primary hover:underline">
            Позвоните нам
          </a>{" "}
          для уточнения сроков поставки.
        </p>
      )}
    </div>
  );
}
