"use client";

export type ProductReadinessIssue =
  | "no-images"
  | "no-variants"
  | "no-price"
  | "out-of-stock"
  | "no-description";

export type ProductReadiness = {
  ready: boolean;
  warnings: ProductReadinessIssue[];
  blockers: ProductReadinessIssue[];
};

type VariantForReadiness = {
  pricePerCube?: number | string | null | { toNumber?: () => number };
  pricePerPiece?: number | string | null | { toNumber?: () => number };
  inStock?: boolean;
};

export type ProductForReadiness = {
  active?: boolean;
  description?: string | null;
  images?: string[];
  variants?: VariantForReadiness[];
};

function toNumber(value: VariantForReadiness["pricePerCube"]): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    const n = value.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function checkProductReadiness(product: ProductForReadiness): ProductReadiness {
  const blockers: ProductReadinessIssue[] = [];
  const warnings: ProductReadinessIssue[] = [];

  if (!product.images || product.images.length === 0) {
    blockers.push("no-images");
  }

  const variants = product.variants ?? [];
  if (variants.length === 0) {
    blockers.push("no-variants");
  } else {
    const hasAnyPrice = variants.some((v) => {
      const cube = toNumber(v.pricePerCube);
      const piece = toNumber(v.pricePerPiece);
      return (cube != null && cube > 0) || (piece != null && piece > 0);
    });
    if (!hasAnyPrice) blockers.push("no-price");

    const hasAnyInStock = variants.some((v) => v.inStock !== false);
    if (!hasAnyInStock) blockers.push("out-of-stock");
  }

  const desc = (product.description ?? "").trim();
  if (desc.length < 40) warnings.push("no-description");

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
}

export function readinessIssueLabel(issue: ProductReadinessIssue): string {
  switch (issue) {
    case "no-images":
      return "Нет фото";
    case "no-variants":
      return "Нет вариантов";
    case "no-price":
      return "Нет цены";
    case "out-of-stock":
      return "Нет в наличии";
    case "no-description":
      return "Нет описания";
  }
}
