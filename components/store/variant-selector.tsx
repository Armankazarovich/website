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
import {
  getUnitLabel,
  getUnitTitle,
  getVariantUnitPrice as readVariantUnitPrice,
  quantityStepForUnit,
} from "@/lib/product-units";
import {
  getVariantOptionMeta,
  matchesVariantQuery,
  uniqueVariantOptionValues,
  type VariantOptionKey,
  type VariantOptionMeta,
} from "@/lib/variant-options";
import { VariantOptionFilterGroups } from "@/components/store/variant-option-filter-groups";

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

interface VariantSelectorProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  saleUnit: "CUBE" | "PIECE" | "SQUARE" | "BOTH";
  variants: Variant[];
  phoneLink?: string;
}

function hasConflictingPiecePrice(variant: Variant) {
  const cube = Number(variant.pricePerCube);
  const piece = Number(variant.pricePerPiece);
  const piecesPerCube = Number(variant.piecesPerCube);
  if (!Number.isFinite(cube) || cube <= 0 || !Number.isFinite(piece) || piece <= 0) return false;
  if (!Number.isFinite(piecesPerCube) || piecesPerCube <= 0) return false;
  const expectedPiece = cube / piecesPerCube;
  const diff = Math.abs(piece - expectedPiece) / Math.max(1, expectedPiece);
  return diff > 0.25;
}

function getVariantUnitPrice(variant: Variant | null | undefined, unitType: UnitType) {
  if (!variant) return null;
  if (unitType === "PIECE" && hasConflictingPiecePrice(variant)) return null;
  return readVariantUnitPrice(variant, unitType);
}

function getPreferredUnit(
  variant: Variant | null | undefined,
  saleUnit: "CUBE" | "PIECE" | "SQUARE" | "BOTH",
  currentUnit?: UnitType,
): UnitType | null {
  const hasCube = Boolean(getVariantUnitPrice(variant, "CUBE"));
  const hasPiece = Boolean(getVariantUnitPrice(variant, "PIECE"));
  const hasSquare = Boolean(getVariantUnitPrice(variant, "SQUARE"));
  if (currentUnit === "CUBE" && hasCube) return "CUBE";
  if (currentUnit === "PIECE" && hasPiece) return "PIECE";
  if (currentUnit === "SQUARE" && hasSquare) return "SQUARE";
  if (saleUnit === "CUBE") return hasCube ? "CUBE" : null;
  if (saleUnit === "PIECE") return hasPiece ? "PIECE" : null;
  if (saleUnit === "SQUARE") return hasSquare ? "SQUARE" : null;
  if (hasCube) return "CUBE";
  if (hasSquare) return "SQUARE";
  if (hasPiece) return "PIECE";
  return null;
}

function pickInitialVariant(variants: Variant[], saleUnit: "CUBE" | "PIECE" | "SQUARE" | "BOTH") {
  const purchasable = variants.filter(isProductVariantPurchasable);
  const candidates = purchasable.length > 0 ? purchasable : variants;
  const preferredUnit: UnitType =
    saleUnit === "PIECE" ? "PIECE" : saleUnit === "SQUARE" ? "SQUARE" : "CUBE";
  return (
    candidates.find((variant) => getVariantUnitPrice(variant, preferredUnit)) ||
    candidates.find((variant) => getPreferredUnit(variant, saleUnit)) ||
    variants[0] ||
    null
  );
}

function quantityStep(unitType: UnitType) {
  return quantityStepForUnit(unitType);
}

function normalizeQuantityForUnit(
  value: number,
  unitType: UnitType,
  variant: Variant | null | undefined,
) {
  const step = quantityStep(unitType);
  const safe = Number.isFinite(value) ? value : step;
  const rounded = unitType === "PIECE" ? Math.round(safe) : Number(safe.toFixed(1));
  const clamped = clampProductQuantity(rounded, variant, unitType);
  const limit = getPurchasableQuantityLimit(variant, unitType);
  if (limit !== null && limit < step) return limit;
  return Math.max(step, clamped);
}

type VariantRow = {
  variant: Variant;
  meta: VariantOptionMeta;
};

type VariantFilters = Record<VariantOptionKey, string | null>;

function variantMatchesFilters(row: VariantRow, filters: VariantFilters) {
  return (
    (!filters.grade || row.meta.grade === filters.grade) &&
    (!filters.section || row.meta.section === filters.section) &&
    (!filters.length || row.meta.length === filters.length)
  );
}

function variantMatchesOptionDependencies(row: VariantRow, filters: VariantFilters, key: VariantOptionKey) {
  if (key === "grade") return true;
  if (key === "section") return !filters.grade || row.meta.grade === filters.grade;
  return (
    (!filters.grade || row.meta.grade === filters.grade) &&
    (!filters.section || row.meta.section === filters.section)
  );
}

function isSelectableRow(row: VariantRow, saleUnit: VariantSelectorProps["saleUnit"]) {
  return isProductVariantPurchasable(row.variant) && Boolean(getPreferredUnit(row.variant, saleUnit));
}

function pickBestRow(rows: VariantRow[], saleUnit: VariantSelectorProps["saleUnit"]) {
  return (
    rows.find((row) => isSelectableRow(row, saleUnit)) ||
    rows[0] ||
    null
  );
}

function filtersFromMeta(meta: VariantOptionMeta): VariantFilters {
  return {
    grade: meta.grade,
    section: meta.section,
    length: meta.length,
  };
}

function recoverVisibleRow(
  rows: VariantRow[],
  filters: VariantFilters,
  saleUnit: VariantSelectorProps["saleUnit"],
) {
  const activeFilters = (Object.entries(filters) as Array<[VariantOptionKey, string | null]>)
    .filter((entry): entry is [VariantOptionKey, string] => Boolean(entry[1]));
  if (activeFilters.length === 0) return pickBestRow(rows, saleUnit);

  const scored = rows
    .map((row) => {
      const score = activeFilters.reduce((sum, [key, value]) => sum + (row.meta[key] === value ? 1 : 0), 0);
      return { row, score, selectable: isSelectableRow(row, saleUnit) ? 1 : 0 };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.selectable - a.selectable);

  return scored[0]?.row ?? pickBestRow(rows, saleUnit);
}

export function VariantSelector({
  productId, productName, productSlug, productImage, saleUnit, variants, phoneLink,
}: VariantSelectorProps) {
  const effectivePhone = phoneLink || PHONE_LINK;
  const { addItem } = useCartStore();
  const initialVariant = pickInitialVariant(variants, saleUnit);
  const initialMeta = initialVariant ? getVariantOptionMeta(initialVariant.size) : null;

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    initialVariant
  );
  const [selectedGrade, setSelectedGrade] = useState<string | null>(initialMeta?.grade ?? null);
  const [selectedSection, setSelectedSection] = useState<string | null>(initialMeta?.section ?? null);
  const [selectedLength, setSelectedLength] = useState<string | null>(initialMeta?.length ?? null);
  const [unitType, setUnitType] = useState<UnitType>(
    getPreferredUnit(initialVariant, saleUnit) ||
      (saleUnit === "PIECE" ? "PIECE" : saleUnit === "SQUARE" ? "SQUARE" : "CUBE")
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [addedTotal, setAddedTotal] = useState(0);
  const [variantQuery, setVariantQuery] = useState("");
  const justAddedTimer = useRef<ReturnType<typeof setTimeout>>();

  const variantRows = useMemo(
    () => variants.map((variant) => ({ variant, meta: getVariantOptionMeta(variant.size) })),
    [variants],
  );
  const selectedFilters: VariantFilters = {
    grade: selectedGrade,
    section: selectedSection,
    length: selectedLength,
  };
  const gradeOptions = useMemo(() => uniqueVariantOptionValues(variantRows, "grade"), [variantRows]);
  const sectionOptions = useMemo(() => uniqueVariantOptionValues(variantRows, "section"), [variantRows]);
  const lengthOptions = useMemo(() => uniqueVariantOptionValues(variantRows, "length"), [variantRows]);
  const visibleRows = useMemo(
    () =>
      variantRows.filter((row) =>
        variantMatchesFilters(row, selectedFilters) && matchesVariantQuery(row.meta, variantQuery),
      ),
    [variantRows, selectedGrade, selectedSection, selectedLength, variantQuery],
  );
  const activeVariant = useMemo(() => {
    if (!selectedVariant) return null;
    const meta = getVariantOptionMeta(selectedVariant.size);
    const row = { variant: selectedVariant, meta };
    if (!variantMatchesFilters(row, selectedFilters)) return null;
    if (!matchesVariantQuery(meta, variantQuery)) return null;
    return selectedVariant;
  }, [selectedVariant, selectedGrade, selectedSection, selectedLength, variantQuery]);

  // Sync unit type with saleUnit and selected size.
  useEffect(() => {
    const preferred = getPreferredUnit(activeVariant, saleUnit, unitType);
    if (!preferred) return;
    if (preferred !== unitType) {
      setUnitType(preferred);
      setQuantity(normalizeQuantityForUnit(1, preferred, activeVariant));
      return;
    }
    setQuantity((value) => normalizeQuantityForUnit(value, preferred, activeVariant));
  }, [activeVariant, saleUnit, unitType]);

  const currentPrice = getVariantUnitPrice(activeVariant, unitType);
  const maxQuantity = getPurchasableQuantityLimit(activeVariant, unitType);
  const canUseCube = Boolean(getVariantUnitPrice(activeVariant, "CUBE"));
  const canUsePiece = Boolean(getVariantUnitPrice(activeVariant, "PIECE"));
  const canUseSquare = Boolean(getVariantUnitPrice(activeVariant, "SQUARE"));
  const unitOptions = [
    { unit: "CUBE" as const, enabled: canUseCube },
    { unit: "SQUARE" as const, enabled: canUseSquare },
    { unit: "PIECE" as const, enabled: canUsePiece },
  ].filter((option) => option.enabled);

  const totalPrice = currentPrice ? currentPrice * quantity : 0;
  const selectedMeta = activeVariant ? getVariantOptionMeta(activeVariant.size) : null;

  const setFilters = (filters: VariantFilters) => {
    setSelectedGrade(filters.grade);
    setSelectedSection(filters.section);
    setSelectedLength(filters.length);
  };

  const selectVariant = (variant: Variant) => {
    const meta = getVariantOptionMeta(variant.size);
    setSelectedVariant(variant);
    setFilters({
      grade: meta.grade,
      section: meta.section,
      length: meta.length,
    });
  };

  const applyFilter = (key: VariantOptionKey, value: string | null) => {
    let nextFilters: VariantFilters = {
      grade: selectedGrade,
      section: selectedSection,
      length: selectedLength,
      [key]: value,
    };

    const candidates = variantRows.filter((row) => variantMatchesFilters(row, nextFilters));
    let best = pickBestRow(candidates, saleUnit);

    if (!best && value) {
      const fallbackRows = variantRows.filter((row) => row.meta[key] === value);
      best = pickBestRow(fallbackRows, saleUnit);
      if (best) {
        nextFilters = filtersFromMeta(best.meta);
      }
    }

    if (best) {
      setSelectedVariant(best.variant);
    } else {
      setSelectedVariant(null);
    }
    setFilters(nextFilters);
  };

  const isOptionVisible = (key: VariantOptionKey, value: string) => {
    return variantRows.some(
      (row) => row.meta[key] === value && variantMatchesOptionDependencies(row, selectedFilters, key) && isSelectableRow(row, saleUnit),
    );
  };

  useEffect(() => {
    if (activeVariant || visibleRows.length === 0) return;
    const best = pickBestRow(visibleRows, saleUnit);
    if (best) setSelectedVariant(best.variant);
  }, [activeVariant, visibleRows, saleUnit]);

  useEffect(() => {
    if (activeVariant || variantQuery.trim() || visibleRows.length > 0) return;
    const best = recoverVisibleRow(variantRows, selectedFilters, saleUnit);
    if (!best) return;
    setSelectedVariant(best.variant);
    setFilters(filtersFromMeta(best.meta));
  }, [activeVariant, visibleRows.length, variantQuery, variantRows, saleUnit, selectedGrade, selectedSection, selectedLength]);

  // Calculate equivalent in other unit
  const equivalentInfo = () => {
    if (!activeVariant || !activeVariant.piecesPerCube) return null;
    if (unitType === "SQUARE") return null;
    if (unitType === "CUBE") {
      const pieces = Math.round(quantity * activeVariant.piecesPerCube);
      return `≈ ${pieces} шт`;
    } else {
      const cubes = (quantity / activeVariant.piecesPerCube).toFixed(2);
      return `≈ ${cubes} м³`;
    }
  };

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!activeVariant || !isProductVariantPurchasable(activeVariant) || !currentPrice) return;
    const safeQuantity = normalizeQuantityForUnit(quantity, unitType, activeVariant);
    if (safeQuantity <= 0) return;

    flyToCart(e.currentTarget, productImage ?? null);
    haptic("success"); // двойной пульс — подтверждение добавления

    addItem({
      variantId: activeVariant.id,
      productId,
      productName,
      productSlug,
      variantSize: activeVariant.size,
      productImage,
      unitType,
      quantity: safeQuantity,
      price: Number(currentPrice),
      maxQuantity,
    });
    trackArayMetrikaGoal("aray_cart_add", {
      source: "product_page",
      productId,
      variantId: activeVariant.id,
      productName,
      variantSize: activeVariant.size,
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
    setQuantity((value) => normalizeQuantityForUnit(value + delta * step, unitType, activeVariant));
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {/* Size selection */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-medium">
              Выберите вариант
              {selectedMeta && (
                <span className="ml-2 inline-flex max-w-full flex-wrap items-center gap-1 align-middle text-sm font-normal text-muted-foreground">
                  <span>{selectedMeta.cleanSize}</span>
                  {selectedMeta.grade && (
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {selectedMeta.grade}
                    </span>
                  )}
                </span>
              )}
            </h3>
            {variants.length > 10 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {variants.length} вариантов
              </p>
            )}
          </div>
        </div>
        <VariantOptionFilterGroups
          groups={[
            { keyName: "grade", label: "Сорт", values: gradeOptions, selected: selectedGrade },
            { keyName: "section", label: "Сечение", values: sectionOptions, selected: selectedSection },
            { keyName: "length", label: "Длина", values: lengthOptions, selected: selectedLength },
          ]}
          onSelect={applyFilter}
          isOptionVisible={isOptionVisible}
        />
        {variants.length > 10 && (
          <label className="relative mb-3 mt-3 block">
            <span className="sr-only">Найти вариант</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={variantQuery}
              onChange={(event) => setVariantQuery(event.target.value)}
              placeholder="Поиск по размеру, длине, сорту..."
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
          {visibleRows.map(({ variant: v, meta }) => {
            const hasSaleUnit = Boolean(getPreferredUnit(v, saleUnit));
            const disabled = !isProductVariantPurchasable(v) || !hasSaleUnit;

            return (
            <button
              key={v.id}
              onClick={() => selectVariant(v)}
              disabled={disabled}
              className={cn(
                "min-h-[3.25rem] rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all",
                activeVariant?.id === v.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50",
                disabled && "opacity-40 cursor-not-allowed line-through"
              )}
            >
              <span className="block leading-tight">{meta.cleanSize}</span>
              {meta.grade && (
                <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">
                  {meta.grade}
                </span>
              )}
            </button>
          );
          })}
          {visibleRows.length === 0 && (
            <p className="col-span-full rounded-xl border border-border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              Вариант не найден
            </p>
          )}
        </div>
      </div>

      {/* Unit type toggle (only if BOTH) */}
      {saleUnit === "BOTH" && (
        <div>
          <h3 className="font-medium mb-3">{"\u0415\u0434\u0438\u043d\u0438\u0446\u0430 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f"}</h3>
          {unitOptions.length > 1 ? (
            <div className="inline-flex rounded-xl border border-border p-1 bg-muted">
              {unitOptions.map(({ unit }) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    setUnitType(unit);
                    setQuantity(normalizeQuantityForUnit(1, unit, activeVariant));
                  }}
                  data-product-unit-option={unit}
                  className={cn(
                    "px-4 py-2.5 sm:py-2 rounded-xl border text-sm font-medium transition-colors",
                    unitType === unit
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {getUnitLabel(unit)}
                </button>
              ))}
            </div>
          ) : unitOptions[0] ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary">
              {getUnitLabel(unitOptions[0].unit)}
              <span className="text-xs font-medium text-muted-foreground">
                {getUnitTitle(unitOptions[0].unit)}
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Цена для выбранного варианта уточняется
            </div>
          )}
        </div>
      )}

      {/* Price display */}
      {currentPrice && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {"\u0426\u0435\u043d\u0430 \u0437\u0430"} {getUnitTitle(unitType)}
              </p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-primary">
                {formatPrice(Number(currentPrice))}
              </p>
            </div>
            {totalPrice > 0 && quantity !== 1 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{"\u0418\u0442\u043e\u0433\u043e \u0437\u0430"} {quantity} {getUnitLabel(unitType)}</p>
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
          {"\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e"} ({getUnitLabel(unitType)})
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
                if (!isNaN(v) && v > 0) setQuantity(normalizeQuantityForUnit(v, unitType, activeVariant));
              }}
              className="w-20 text-center text-base py-3 bg-background border-x border-border font-medium focus:outline-none"
              step={quantityStep(unitType)}
              min={quantityStep(unitType)}
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
          disabled={!activeVariant || !isProductVariantPurchasable(activeVariant) || !currentPrice || justAdded}
        >
          {justAdded ? (
            <span className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <Check className="w-5 h-5 shrink-0" />
              <span className="truncate">
                {quantity} {getUnitLabel(unitType)} {"\u00b7"} {formatPrice(addedTotal)}
              </span>
            </span>
          ) : !activeVariant || !isProductVariantPurchasable(activeVariant) ? (
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

      {(!activeVariant || !isProductVariantPurchasable(activeVariant)) && (
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
