export type ProductAvailabilityStatus =
  | "in-stock"
  | "low-stock"
  | "on-order"
  | "out-of-stock";

export type ProductAvailabilityVariant = {
  inStock?: boolean | null;
  stockQty?: number | null;
  lowStockThreshold?: number | null;
  piecesPerCube?: number | null;
};

export type ProductUnitType = "CUBE" | "PIECE";

export type ProductAvailability = {
  status: ProductAvailabilityStatus;
  label: string;
  className: string;
  isPurchasable: boolean;
  schemaAvailability: "https://schema.org/InStock" | "https://schema.org/PreOrder" | "https://schema.org/OutOfStock";
};

export function isTrackedStock(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isProductVariantPurchasable(variant: ProductAvailabilityVariant) {
  if (variant.inStock !== true) return false;
  return !isTrackedStock(variant.stockQty) || variant.stockQty > 0;
}

function getOutOfStockAvailability(): ProductAvailability {
  return {
    status: "out-of-stock",
    label: "Нет в наличии",
    className: "is-out-of-stock",
    isPurchasable: false,
    schemaAvailability: "https://schema.org/OutOfStock",
  };
}

export function getPurchasableQuantityLimit(
  variant: ProductAvailabilityVariant | null | undefined,
  unitType?: ProductUnitType,
) {
  if (!variant || !isTrackedStock(variant.stockQty)) return null;
  const stockQty = Math.max(0, variant.stockQty);
  if (unitType === "CUBE") {
    const piecesPerCube = Number(variant.piecesPerCube);
    if (Number.isFinite(piecesPerCube) && piecesPerCube > 0) {
      return stockQty / piecesPerCube;
    }
  }
  return stockQty;
}

export function clampProductQuantity(
  quantity: number,
  variant: ProductAvailabilityVariant | null | undefined,
  unitType?: ProductUnitType,
) {
  const limit = getPurchasableQuantityLimit(variant, unitType);
  const safeQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
  if (limit === null) return safeQuantity;
  return Math.min(safeQuantity, limit);
}

export function getProductAvailability(variants: ProductAvailabilityVariant[] = []): ProductAvailability {
  const hasVariants = variants.length > 0;
  const purchasableVariants = variants.filter(isProductVariantPurchasable);

  if (purchasableVariants.length > 0) {
    const isLowStock = purchasableVariants.some((variant) => (
      isTrackedStock(variant.stockQty) &&
      isTrackedStock(variant.lowStockThreshold) &&
      variant.lowStockThreshold > 0 &&
      variant.stockQty > 0 &&
      variant.stockQty <= variant.lowStockThreshold
    ));

    return {
      status: isLowStock ? "low-stock" : "in-stock",
      label: isLowStock ? "Мало" : "В наличии",
      className: isLowStock ? "is-low-stock" : "is-in-stock",
      isPurchasable: true,
      schemaAvailability: "https://schema.org/InStock",
    };
  }

  const hasTrackedStock = variants.some((variant) => isTrackedStock(variant.stockQty));
  const trackedStockIsSoldOut = hasTrackedStock && variants.every((variant) => {
    if (isTrackedStock(variant.stockQty)) return variant.stockQty <= 0;
    return variant.inStock !== true;
  });

  if (trackedStockIsSoldOut) {
    return getOutOfStockAvailability();
  }

  if (hasVariants) {
    return {
      status: "on-order",
      label: "Под заказ",
      className: "is-on-order",
      isPurchasable: false,
      schemaAvailability: "https://schema.org/PreOrder",
    };
  }

  return getOutOfStockAvailability();
}
