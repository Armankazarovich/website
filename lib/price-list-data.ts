import { prisma } from "@/lib/prisma";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { getVariantOptionMeta } from "@/lib/variant-options";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

export type PriceListUnit = "CUBE" | "SQUARE" | "PIECE";

export const PRICE_LIST_UNITS: Record<PriceListUnit, { label: string; title: string; sort: number }> = {
  CUBE: { label: "м³", title: "за 1 м³", sort: 1 },
  SQUARE: { label: "м²", title: "за 1 м²", sort: 2 },
  PIECE: { label: "шт", title: "за 1 шт", sort: 3 },
};

export type PriceListFilters = {
  category?: string;
  q?: string;
  unit?: PriceListUnit | "ALL";
};

export type PriceListUnitPrice = {
  unit: PriceListUnit;
  label: string;
  title: string;
  price: number;
};

export type PriceListRow = {
  key: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  categoryName: string;
  categorySlug: string;
  saleUnit: "CUBE" | "PIECE" | "SQUARE" | "BOTH";
  variantId: string;
  variantSize: string;
  displaySize: string;
  grade: string | null;
  piecesPerCube: number | null;
  stockQty: number | null;
  updatedAt: Date;
  availableUnits: PriceListUnitPrice[];
  preferredUnit: PriceListUnit;
  minPrice: number;
};

export type PriceListCategory = {
  name: string;
  slug: string;
  productCount: number;
  rowCount: number;
};

export type PriceListData = {
  rows: PriceListRow[];
  groupedRows: Array<{ category: PriceListCategory; rows: PriceListRow[] }>;
  categories: PriceListCategory[];
  filters: Required<PriceListFilters>;
  totalRows: number;
  totalProducts: number;
  generatedAt: Date;
  latestUpdatedAt: Date;
};

type RawVariant = {
  id: string;
  size: string;
  pricePerCube: unknown;
  pricePerSquareMeter: unknown;
  pricePerPiece: unknown;
  piecesPerCube: number | null;
  stockQty: number | null;
  updatedAt: Date;
  sortOrder: number;
};

type RawProduct = {
  id: string;
  slug: string;
  name: string;
  images: string[];
  saleUnit: "CUBE" | "PIECE" | "SQUARE" | "BOTH";
  updatedAt: Date;
  category: { name: string; slug: string; sortOrder: number };
  variants: RawVariant[];
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && typeof (value as { toNumber?: unknown }).toNumber === "function") {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function saleUnitAllows(saleUnit: RawProduct["saleUnit"], unit: PriceListUnit) {
  return saleUnit === "BOTH" || saleUnit === unit;
}

function hasConflictingPiecePrice(variant: RawVariant) {
  const cube = toNumber(variant.pricePerCube);
  const piece = toNumber(variant.pricePerPiece);
  const piecesPerCube = Number(variant.piecesPerCube);
  if (!cube || !piece || !Number.isFinite(piecesPerCube) || piecesPerCube <= 0) return false;
  const expectedPiece = cube / piecesPerCube;
  const diff = Math.abs(piece - expectedPiece) / Math.max(1, expectedPiece);
  return diff > 0.25;
}

function unitPrice(variant: RawVariant, unit: PriceListUnit) {
  if (unit === "PIECE" && hasConflictingPiecePrice(variant)) return null;
  const value =
    unit === "CUBE"
      ? variant.pricePerCube
      : unit === "SQUARE"
        ? variant.pricePerSquareMeter
        : variant.pricePerPiece;
  const price = toNumber(value);
  return price != null && price > 0 ? price : null;
}

function availableUnitPrices(product: RawProduct, variant: RawVariant): PriceListUnitPrice[] {
  return (Object.keys(PRICE_LIST_UNITS) as PriceListUnit[])
    .flatMap((unit) => {
      if (!saleUnitAllows(product.saleUnit, unit)) return [];
      const price = unitPrice(variant, unit);
      if (!price) return [];
      return [{ unit, ...PRICE_LIST_UNITS[unit], price }];
    })
    .sort((a, b) => PRICE_LIST_UNITS[a.unit].sort - PRICE_LIST_UNITS[b.unit].sort);
}

function preferredUnit(saleUnit: RawProduct["saleUnit"], available: PriceListUnitPrice[]): PriceListUnit | null {
  const order: PriceListUnit[] =
    saleUnit === "PIECE"
      ? ["PIECE", "SQUARE", "CUBE"]
      : saleUnit === "SQUARE"
        ? ["SQUARE", "PIECE", "CUBE"]
        : ["CUBE", "SQUARE", "PIECE"];
  return order.find((unit) => available.some((entry) => entry.unit === unit)) ?? available[0]?.unit ?? null;
}

function normalizeFilters(filters: PriceListFilters): Required<PriceListFilters> {
  const unit = filters.unit === "CUBE" || filters.unit === "SQUARE" || filters.unit === "PIECE"
    ? filters.unit
    : "ALL";
  return {
    category: (filters.category || "").trim(),
    q: (filters.q || "").trim(),
    unit,
  };
}

function matchesSearch(row: PriceListRow, query: string) {
  if (!query) return true;
  const haystack = [
    row.productName,
    row.categoryName,
    row.variantSize,
    row.displaySize,
    row.grade,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query.toLowerCase().split(/\s+/).every((part) => haystack.includes(part));
}

export async function getPriceListData(filters: PriceListFilters = {}): Promise<PriceListData> {
  const normalized = normalizeFilters(filters);

  const products = await prisma.product.findMany({
    where: {
      tenantId: DEFAULT_TENANT_ID,
      ...getPublicProductsFilter(),
      category: { tenantId: DEFAULT_TENANT_ID, showInMenu: true },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      images: true,
      saleUnit: true,
      updatedAt: true,
      category: { select: { name: true, slug: true, sortOrder: true } },
      variants: {
        where: getPublicVariantsFilter(),
        select: {
          id: true,
          size: true,
          pricePerCube: true,
          pricePerSquareMeter: true,
          pricePerPiece: true,
          piecesPerCube: true,
          stockQty: true,
          updatedAt: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { size: "asc" }],
      },
    },
  });

  const allRows = (products as RawProduct[])
    .sort((a, b) => (
      a.category.sortOrder - b.category.sortOrder ||
      a.category.name.localeCompare(b.category.name, "ru") ||
      a.name.localeCompare(b.name, "ru")
    ))
    .flatMap((product) =>
      product.variants.flatMap((variant) => {
        const availableUnits = availableUnitPrices(product, variant);
        const unit =
          normalized.unit !== "ALL" && availableUnits.some((entry) => entry.unit === normalized.unit)
            ? normalized.unit
            : preferredUnit(product.saleUnit, availableUnits);
        if (!unit) return [];
        const meta = getVariantOptionMeta(variant.size);
        const minPrice = Math.min(...availableUnits.map((entry) => entry.price));
        return [{
          key: `${product.id}-${variant.id}`,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          productImage: product.images[0] ?? null,
          categoryName: product.category.name,
          categorySlug: product.category.slug,
          saleUnit: product.saleUnit,
          variantId: variant.id,
          variantSize: variant.size,
          displaySize: meta.cleanSize || variant.size,
          grade: meta.grade || null,
          piecesPerCube: variant.piecesPerCube,
          stockQty: variant.stockQty,
          updatedAt: variant.updatedAt > product.updatedAt ? variant.updatedAt : product.updatedAt,
          availableUnits,
          preferredUnit: unit,
          minPrice,
        } satisfies PriceListRow];
      }),
    );

  const categoryMap = new Map<string, { name: string; slug: string; productIds: Set<string>; rowCount: number }>();
  for (const row of allRows) {
    const current = categoryMap.get(row.categorySlug) ?? {
      name: row.categoryName,
      slug: row.categorySlug,
      productIds: new Set<string>(),
      rowCount: 0,
    };
    current.productIds.add(row.productId);
    current.rowCount += 1;
    categoryMap.set(row.categorySlug, current);
  }

  const categories = Array.from(categoryMap.values()).map((category) => ({
    name: category.name,
    slug: category.slug,
    productCount: category.productIds.size,
    rowCount: category.rowCount,
  }));

  const rows = allRows.filter((row) => {
    if (normalized.category && row.categorySlug !== normalized.category) return false;
    if (normalized.unit !== "ALL" && !row.availableUnits.some((entry) => entry.unit === normalized.unit)) return false;
    return matchesSearch(row, normalized.q);
  });

  const groupedRows = categories
    .map((category) => ({
      category,
      rows: rows.filter((row) => row.categorySlug === category.slug),
    }))
    .filter((group) => group.rows.length > 0);

  const latestUpdatedAt = rows.reduce<Date>(
    (latest, row) => (row.updatedAt > latest ? row.updatedAt : latest),
    new Date("2026-06-13T00:00:00.000Z"),
  );

  return {
    rows,
    groupedRows,
    categories,
    filters: normalized,
    totalRows: rows.length,
    totalProducts: new Set(rows.map((row) => row.productId)).size,
    generatedAt: new Date(),
    latestUpdatedAt,
  };
}
