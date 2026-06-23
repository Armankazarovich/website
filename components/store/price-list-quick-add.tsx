"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCartStore, type UnitType } from "@/store/cart";
import { cn, formatPrice } from "@/lib/utils";
import { getPurchasableQuantityLimit } from "@/lib/product-availability";
import { trackArayMetrikaGoal } from "@/lib/aray-metrika-goals";

type QuickAddUnit = {
  unit: UnitType;
  label: string;
  title: string;
  price: number;
};

type PriceListQuickAddProps = {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  variantId: string;
  variantSize: string;
  preferredUnit: UnitType;
  availableUnits: QuickAddUnit[];
  stockQty: number | null;
  piecesPerCube: number | null;
};

function formatQty(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString("ru-RU")
    : value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

export function PriceListQuickAdd({
  productId,
  productSlug,
  productName,
  productImage,
  variantId,
  variantSize,
  preferredUnit,
  availableUnits,
  stockQty,
  piecesPerCube,
}: PriceListQuickAddProps) {
  const { addItem, updateQuantity, hydrateCart, items } = useCartStore();
  const [selectedUnit, setSelectedUnit] = useState<UnitType>(preferredUnit);

  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  const selected = useMemo(
    () => availableUnits.find((entry) => entry.unit === selectedUnit) ?? availableUnits[0],
    [availableUnits, selectedUnit],
  );
  const cartId = selected ? `${variantId}-${selected.unit}` : "";
  const cartItem = items.find((item) => item.id === cartId);
  const cartQty = cartItem?.quantity ?? 0;
  const maxQuantity = getPurchasableQuantityLimit({ stockQty, piecesPerCube, inStock: true }, selected?.unit);
  const remaining = maxQuantity == null ? null : Math.max(0, maxQuantity - cartQty);
  const canAdd = Boolean(selected) && (remaining == null || remaining > 0);

  const addOne = () => {
    if (!selected || !canAdd) return;
    const quantity = remaining == null ? 1 : Math.min(1, remaining);
    if (quantity <= 0) return;

    addItem({
      variantId,
      productId,
      productName,
      productSlug,
      variantSize,
      productImage: productImage ?? undefined,
      unitType: selected.unit,
      quantity,
      price: selected.price,
      maxQuantity,
    });
    trackArayMetrikaGoal("aray_cart_add", {
      source: "price_list",
      productId,
      variantId,
      productName,
      variantSize,
      unit: selected.unit,
      quantity,
      price: selected.price,
    });
  };

  const decrement = () => {
    if (!cartItem) return;
    const next = Number((cartItem.quantity - 1).toFixed(1));
    updateQuantity(cartItem.id, next > 0 ? next : 0);
  };

  if (!selected) {
    return (
      <span className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-xs text-muted-foreground">
        Нет цены
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
      {availableUnits.length > 1 ? (
        <div className="inline-flex w-full overflow-hidden rounded-xl border border-border bg-background/70 p-0.5 sm:w-auto">
          {availableUnits.map((entry) => (
            <button
              key={entry.unit}
              type="button"
              title={`${entry.title}: ${formatPrice(entry.price)}`}
              aria-pressed={selected.unit === entry.unit}
              onClick={() => setSelectedUnit(entry.unit)}
              className={cn(
                "flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors sm:flex-none",
                selected.unit === entry.unit
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : (
        <span className="self-start rounded-xl border border-border bg-muted/35 px-3 py-1.5 text-[11px] font-bold text-muted-foreground sm:self-end">
          {selected.label}
        </span>
      )}

      {cartQty > 0 ? (
        <div className="grid h-11 grid-cols-[44px_minmax(56px,1fr)_44px] overflow-hidden rounded-2xl border border-primary/35 bg-primary/10">
          <button
            type="button"
            onClick={decrement}
            className="flex items-center justify-center text-primary transition-colors hover:bg-primary/10"
            aria-label="Уменьшить количество"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-center border-x border-primary/20 px-2 text-sm font-black tabular-nums text-foreground">
            {formatQty(cartQty)}
            <span className="ml-1 text-[11px] font-bold text-muted-foreground">{selected.label}</span>
          </div>
          <button
            type="button"
            onClick={addOne}
            disabled={!canAdd}
            className="flex items-center justify-center bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Добавить ещё"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={addOne}
          disabled={!canAdd}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          aria-label={`Добавить ${productName} ${variantSize} в корзину`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>+</span>
          <span className="hidden sm:inline">В корзину</span>
        </button>
      )}
    </div>
  );
}
