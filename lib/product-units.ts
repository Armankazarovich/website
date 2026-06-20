export type ProductUnitType = "CUBE" | "PIECE" | "SQUARE";
export type ProductSaleUnit = ProductUnitType | "BOTH";

export type VariantUnitPrices = {
  pricePerCube?: number | string | null | { toNumber?: () => number };
  pricePerPiece?: number | string | null | { toNumber?: () => number };
  pricePerSquareMeter?: number | string | null | { toNumber?: () => number };
};

export const PRODUCT_UNITS: ProductUnitType[] = ["CUBE", "PIECE", "SQUARE"];

export function numberOrNull(value: VariantUnitPrices["pricePerCube"]): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    const n = value.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getVariantUnitPrice(variant: VariantUnitPrices | null | undefined, unitType: ProductUnitType) {
  if (!variant) return null;
  const price =
    unitType === "CUBE"
      ? variant.pricePerCube
      : unitType === "SQUARE"
        ? variant.pricePerSquareMeter
        : variant.pricePerPiece;
  const n = numberOrNull(price);
  return n != null && n > 0 ? n : null;
}

export function getUnitLabel(unitType: ProductUnitType) {
  if (unitType === "CUBE") return "м³";
  if (unitType === "SQUARE") return "м²";
  return "шт";
}

export function getUnitTitle(unitType: ProductUnitType) {
  return `1 ${getUnitLabel(unitType)}`;
}

export function getUnitCaption(unitType: ProductUnitType) {
  if (unitType === "CUBE") return "за куб";
  if (unitType === "SQUARE") return "за квадратный метр";
  return "за штуку";
}

export function saleUnitAllows(saleUnit: ProductSaleUnit | string, unitType: ProductUnitType) {
  return saleUnit === "BOTH" || saleUnit === unitType;
}

export function getSaleUnitPreferredOrder(saleUnit: ProductSaleUnit | string): ProductUnitType[] {
  if (saleUnit === "PIECE") return ["PIECE", "SQUARE", "CUBE"];
  if (saleUnit === "SQUARE") return ["SQUARE", "PIECE", "CUBE"];
  if (saleUnit === "CUBE") return ["CUBE", "PIECE", "SQUARE"];
  return ["CUBE", "SQUARE", "PIECE"];
}

export function getAvailableUnitOptions(variant: VariantUnitPrices | null | undefined): ProductUnitType[] {
  return PRODUCT_UNITS.filter((unit) => Boolean(getVariantUnitPrice(variant, unit)));
}

export function pickVariantUnit(
  variant: VariantUnitPrices | null | undefined,
  saleUnit: ProductSaleUnit | string,
  currentUnit?: ProductUnitType,
): ProductUnitType | null {
  if (currentUnit && saleUnitAllows(saleUnit, currentUnit) && getVariantUnitPrice(variant, currentUnit)) return currentUnit;
  for (const unit of getSaleUnitPreferredOrder(saleUnit)) {
    if (saleUnitAllows(saleUnit, unit) && getVariantUnitPrice(variant, unit)) return unit;
  }
  return getAvailableUnitOptions(variant).find((unit) => saleUnitAllows(saleUnit, unit)) ?? null;
}

export function quantityStepForUnit(unitType: ProductUnitType) {
  return unitType === "CUBE" || unitType === "SQUARE" ? 0.1 : 1;
}
