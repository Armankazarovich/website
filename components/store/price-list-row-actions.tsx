"use client";

import { useEffect, useMemo, useState } from "react";
import { PriceListQuickAdd } from "@/components/store/price-list-quick-add";
import { cn, formatPrice } from "@/lib/utils";
import type { UnitType } from "@/store/cart";

type PriceListRowUnit = {
  unit: UnitType;
  label: string;
  title: string;
  price: number;
};

type PriceListRowActionsProps = {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  variantId: string;
  variantSize: string;
  preferredUnit: UnitType;
  availableUnits: PriceListRowUnit[];
  stockQty: number | null;
  piecesPerCube: number | null;
};

export function PriceListRowActions({
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
}: PriceListRowActionsProps) {
  const [selectedUnit, setSelectedUnit] = useState<UnitType>(preferredUnit);

  useEffect(() => {
    setSelectedUnit(preferredUnit);
  }, [preferredUnit]);

  const selected = useMemo(
    () => availableUnits.find((entry) => entry.unit === selectedUnit) ?? availableUnits[0],
    [availableUnits, selectedUnit],
  );

  if (!selected) return null;

  return (
    <>
      <div className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1 md:order-2 md:justify-end">
        {availableUnits.map((entry) => (
          <button
            key={entry.unit}
            type="button"
            title={`${entry.title}: ${formatPrice(entry.price)}`}
            aria-pressed={selected.unit === entry.unit}
            aria-label={`Select ${entry.label} for ${productName}`}
            onClick={() => setSelectedUnit(entry.unit)}
            data-price-list-unit-option={`${variantId}-${entry.unit}`}
            className={cn(
              "inline-flex min-h-8 min-w-9 items-center justify-center rounded-lg border px-2 text-[11px] font-black transition-colors",
              selected.unit === entry.unit
                ? "border-primary/55 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]"
                : "border-border bg-background/55 text-muted-foreground hover:border-primary/35 hover:text-foreground",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1 md:order-3 md:justify-end">
        <span
          data-price-list-selected-price={`${variantId}-${selected.unit}`}
          className="inline-flex min-h-8 items-center rounded-lg border border-border/70 bg-background/70 px-2.5 py-1 text-[12px] font-bold text-foreground"
        >
          {formatPrice(selected.price)}
        </span>
      </div>

      <PriceListQuickAdd
        compact
        showUnitSelector={false}
        className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto md:order-5"
        productId={productId}
        productSlug={productSlug}
        productName={productName}
        productImage={productImage}
        variantId={variantId}
        variantSize={variantSize}
        preferredUnit={selected.unit}
        selectedUnit={selected.unit}
        onSelectedUnitChange={setSelectedUnit}
        availableUnits={availableUnits}
        stockQty={stockQty}
        piecesPerCube={piecesPerCube}
      />
    </>
  );
}
