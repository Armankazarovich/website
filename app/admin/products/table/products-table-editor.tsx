"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowLeft,
  Check,
  CheckCircle2,
  Columns3,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Table2,
} from "lucide-react";
import { useAdminPageActions, useAdminPageHeader } from "@/components/admin/admin-page-actions";

type SaleUnit = "CUBE" | "PIECE" | "SQUARE" | "BOTH";

type ApiVariant = {
  id: string;
  size: string | null;
  pricePerCube: number | string | null;
  pricePerPiece: number | string | null;
  pricePerSquareMeter: number | string | null;
  piecesPerCube: number | null;
  stockQty?: number | null;
  lowStockThreshold?: number | null;
  sortOrder?: number | null;
  inStock: boolean;
};

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  saleUnit: SaleUnit;
  active: boolean;
  featured?: boolean;
  shortDescription?: string | null;
  description?: string | null;
  cardTags?: string[] | null;
  category?: { id?: string; name?: string | null } | null;
  variants?: ApiVariant[];
};

type ApiCategory = {
  id: string;
  name: string;
};

type Row = {
  productId: string;
  productName: string;
  productSlug: string;
  productActive: boolean;
  productFeatured: boolean;
  productShortDescription: string;
  productDescription: string;
  productTags: string;
  categoryId: string;
  categoryName: string;
  saleUnit: SaleUnit;
  variantId: string;
  size: string;
  pricePerCube: number | string | null;
  pricePerSquareMeter: number | string | null;
  pricePerPiece: number | string | null;
  piecesPerCube: number | null;
  stockQty: number | null;
  lowStockThreshold: number;
  variantSortOrder: number;
  inStock: boolean;
};

type DraftField =
  | "productName"
  | "productSlug"
  | "categoryId"
  | "saleUnit"
  | "productTags"
  | "productFeatured"
  | "shortDescription"
  | "description"
  | "size"
  | "pricePerCube"
  | "pricePerSquareMeter"
  | "pricePerPiece"
  | "piecesPerCube"
  | "stockQty"
  | "lowStockThreshold"
  | "variantSortOrder"
  | "inStock"
  | "productActive";

type Draft = Partial<Record<DraftField, string>>;

type BulkMode = "set" | "clear" | "increasePercent" | "decreasePercent" | "increaseAmount" | "decreaseAmount" | "replaceText";
type BulkScope = "selected" | "visible" | "filtered";
type BulkKind = "text" | "number" | "boolean" | "category" | "saleUnit";
type SortKey =
  | "categoryName"
  | "productName"
  | "size"
  | "pricePerCube"
  | "pricePerSquareMeter"
  | "pricePerPiece"
  | "variantSortOrder"
  | "stockQty";
type SortDirection = "asc" | "desc";
type ColumnKey =
  | "select"
  | "product"
  | "category"
  | "seo"
  | "tags"
  | "saleUnit"
  | "featured"
  | "size"
  | "pricePerCube"
  | "pricePerSquareMeter"
  | "pricePerPiece"
  | "piecesPerCube"
  | "stockQty"
  | "variantSortOrder"
  | "status"
  | "action";

const EDITABLE_FIELDS: DraftField[] = [
  "productName",
  "productSlug",
  "categoryId",
  "saleUnit",
  "productTags",
  "productFeatured",
  "shortDescription",
  "description",
  "size",
  "pricePerCube",
  "pricePerSquareMeter",
  "pricePerPiece",
  "piecesPerCube",
  "stockQty",
  "lowStockThreshold",
  "variantSortOrder",
  "inStock",
  "productActive",
];

const VARIANT_FIELDS = new Set<DraftField>([
  "size",
  "pricePerCube",
  "pricePerSquareMeter",
  "pricePerPiece",
  "piecesPerCube",
  "stockQty",
  "lowStockThreshold",
  "variantSortOrder",
  "inStock",
]);

const BULK_FIELDS: { value: DraftField; label: string; kind: BulkKind }[] = [
  { value: "productName", label: "Название", kind: "text" },
  { value: "productSlug", label: "SEO slug", kind: "text" },
  { value: "categoryId", label: "Категория", kind: "category" },
  { value: "saleUnit", label: "Ед. продажи", kind: "saleUnit" },
  { value: "productTags", label: "Теги/фильтры", kind: "text" },
  { value: "shortDescription", label: "SEO кратко", kind: "text" },
  { value: "description", label: "Описание", kind: "text" },
  { value: "pricePerCube", label: "Цена м³", kind: "number" },
  { value: "pricePerSquareMeter", label: "Цена м²", kind: "number" },
  { value: "pricePerPiece", label: "Цена шт", kind: "number" },
  { value: "piecesPerCube", label: "Шт/м³", kind: "number" },
  { value: "stockQty", label: "Остаток", kind: "number" },
  { value: "variantSortOrder", label: "Порядок", kind: "number" },
  { value: "size", label: "Размер", kind: "text" },
  { value: "inStock", label: "Наличие", kind: "boolean" },
  { value: "productFeatured", label: "Рекомендуемый", kind: "boolean" },
  { value: "productActive", label: "Показ на сайте", kind: "boolean" },
];

const COLUMN_DEFS: { key: ColumnKey; label: string; always?: boolean }[] = [
  { key: "select", label: "Выбор", always: true },
  { key: "product", label: "Товар", always: true },
  { key: "category", label: "Категория" },
  { key: "seo", label: "SEO" },
  { key: "tags", label: "Теги" },
  { key: "saleUnit", label: "Ед." },
  { key: "featured", label: "Хит" },
  { key: "size", label: "Размер", always: true },
  { key: "pricePerCube", label: "м³" },
  { key: "pricePerSquareMeter", label: "м²" },
  { key: "pricePerPiece", label: "шт" },
  { key: "piecesPerCube", label: "шт/м³" },
  { key: "stockQty", label: "Остаток" },
  { key: "variantSortOrder", label: "Порядок" },
  { key: "status", label: "Статус", always: true },
  { key: "action", label: "Действие", always: true },
];

const DEFAULT_VISIBLE_COLUMNS = new Set<ColumnKey>([
  "select",
  "product",
  "category",
  "size",
  "pricePerCube",
  "pricePerSquareMeter",
  "pricePerPiece",
  "piecesPerCube",
  "stockQty",
  "status",
  "action",
]);

const COLUMN_STORAGE_KEY = "pilorus-admin-products-table-columns-v2";
const PAGE_SIZE = 80;

function toInputValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeComparable(value: unknown) {
  return String(value ?? "").trim();
}

function hasPositivePrice(row: Row) {
  return [row.pricePerCube, row.pricePerSquareMeter, row.pricePerPiece].some((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
  });
}

function saleUnitLabel(unit: SaleUnit) {
  if (unit === "CUBE") return "м³";
  if (unit === "SQUARE") return "м²";
  if (unit === "PIECE") return "шт";
  return "м³ / м² / шт";
}

function flattenProducts(products: ApiProduct[]): Row[] {
  return products.flatMap((product) =>
    (product.variants ?? []).map((variant) => ({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productActive: product.active,
      productFeatured: Boolean(product.featured),
      productShortDescription: product.shortDescription || "",
      productDescription: product.description || "",
      productTags: (product.cardTags ?? []).join(", "),
      categoryId: product.categoryId,
      categoryName: product.category?.name || "Без категории",
      saleUnit: product.saleUnit,
      variantId: variant.id,
      size: variant.size || "",
      pricePerCube: variant.pricePerCube,
      pricePerSquareMeter: variant.pricePerSquareMeter,
      pricePerPiece: variant.pricePerPiece,
      piecesPerCube: variant.piecesPerCube ?? null,
      stockQty: variant.stockQty ?? null,
      lowStockThreshold: variant.lowStockThreshold ?? 0,
      variantSortOrder: variant.sortOrder ?? 0,
      inStock: variant.inStock,
    }))
  );
}

function draftForRow(row: Row, drafts: Record<string, Draft>) {
  return drafts[row.variantId] ?? {};
}

function originalValue(row: Row, field: DraftField) {
  if (field === "productName") return row.productName;
  if (field === "productSlug") return row.productSlug;
  if (field === "categoryId") return row.categoryId;
  if (field === "saleUnit") return row.saleUnit;
  if (field === "productTags") return row.productTags;
  if (field === "productFeatured") return row.productFeatured ? "true" : "false";
  if (field === "shortDescription") return row.productShortDescription;
  if (field === "description") return row.productDescription;
  if (field === "size") return row.size;
  if (field === "inStock") return row.inStock ? "true" : "false";
  if (field === "productActive") return row.productActive ? "true" : "false";
  return toInputValue(row[field]);
}

function isRowDirty(row: Row, drafts: Record<string, Draft>) {
  const draft = draftForRow(row, drafts);
  return EDITABLE_FIELDS.some((field) => {
    if (!(field in draft)) return false;
    return normalizeComparable(draft[field]) !== normalizeComparable(originalValue(row, field));
  });
}

function buildPatchPayload(row: Row, drafts: Record<string, Draft>) {
  const draft = draftForRow(row, drafts);
  const payload: Record<string, unknown> = { variantId: row.variantId };
  for (const field of EDITABLE_FIELDS) {
    if (!(field in draft)) continue;
    const nextValue = normalizeComparable(draft[field]);
    if (nextValue === normalizeComparable(originalValue(row, field))) continue;
    if (field === "size" || field === "productName" || field === "productSlug" || field === "shortDescription" || field === "description") {
      payload[field] = nextValue;
    } else if (field === "productTags") {
      payload.cardTags = nextValue;
    } else if (field === "productFeatured") {
      payload.featured = nextValue === "true";
    } else if (field === "productActive") {
      payload.productActive = nextValue === "true";
    } else if (field === "inStock") {
      payload.inStock = nextValue === "true";
    } else if (field === "categoryId" || field === "saleUnit") {
      payload[field] = nextValue;
    } else if (field === "variantSortOrder") {
      payload.variantSortOrder = nextValue === "" ? null : nextValue;
    } else if (VARIANT_FIELDS.has(field)) {
      payload[field] = nextValue === "" ? null : nextValue;
    }
  }
  return payload;
}

function effectiveBoolean(row: Row, drafts: Record<string, Draft>, field: "inStock" | "productActive" | "productFeatured") {
  return rowInputValue(row, drafts, field) === "true";
}

function rowInputValue(row: Row, drafts: Record<string, Draft>, field: DraftField) {
  const draft = draftForRow(row, drafts);
  return field in draft ? draft[field] ?? "" : originalValue(row, field);
}

function applySavedProduct(products: ApiProduct[], updatedProduct?: Partial<ApiProduct> | null) {
  if (!updatedProduct?.id) return products;
  return products.map((product) =>
    product.id === updatedProduct.id
      ? {
          ...product,
          ...updatedProduct,
          category: updatedProduct.category ?? product.category,
        }
      : product
  );
}

function getColumnWidth(column: ColumnKey) {
  const widths: Record<ColumnKey, string> = {
    select: "w-[52px]",
    product: "w-[300px]",
    category: "w-[190px]",
    seo: "w-[260px]",
    tags: "w-[180px]",
    saleUnit: "w-[130px]",
    featured: "w-[110px]",
    size: "w-[170px]",
    pricePerCube: "w-[120px]",
    pricePerSquareMeter: "w-[120px]",
    pricePerPiece: "w-[120px]",
    piecesPerCube: "w-[110px]",
    stockQty: "w-[100px]",
    variantSortOrder: "w-[105px]",
    status: "w-[120px]",
    action: "w-[150px]",
  };
  return widths[column];
}

function sortValue(row: Row, key: SortKey) {
  const value = row[key];
  if (key.startsWith("price") || key === "stockQty" || key === "variantSortOrder") {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return String(value ?? "");
}

function CellInput({
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={`h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  );
}

function CellTextarea({
  value,
  onChange,
  ariaLabel,
  rows = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="min-h-10 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}

function CellSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
    >
      {children}
    </select>
  );
}

export function ProductsTableEditor() {
  const router = useRouter();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [unit, setUnit] = useState<"ALL" | "CUBE" | "SQUARE" | "PIECE">("ALL");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "HIDDEN" | "NO_PRICE" | "OUT">("ALL");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkScope, setBulkScope] = useState<BulkScope>("selected");
  const [bulkField, setBulkField] = useState<DraftField>("pricePerCube");
  const [bulkMode, setBulkMode] = useState<BulkMode>("set");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkReplaceValue, setBulkReplaceValue] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => new Set(DEFAULT_VISIBLE_COLUMNS));
  const [sortKey, setSortKey] = useState<SortKey>("categoryName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [featuredFilter, setFeaturedFilter] = useState<"ALL" | "FEATURED" | "PLAIN">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/products?scope=all", { cache: "no-store" }),
        fetch("/api/admin/categories", { cache: "no-store" }),
      ]);
      const [productsJson, categoriesJson] = await Promise.all([
        productsRes.json().catch(() => null),
        categoriesRes.json().catch(() => null),
      ]);
      if (!productsRes.ok || !Array.isArray(productsJson)) {
        throw new Error(productsJson?.error || "Не удалось загрузить товары");
      }
      if (!categoriesRes.ok || !Array.isArray(categoriesJson)) {
        throw new Error(categoriesJson?.error || "Не удалось загрузить категории");
      }
      setProducts(productsJson);
      setCategories(categoriesJson.map((item: ApiCategory) => ({ id: item.id, name: item.name })));
      setDrafts({});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось открыть таблицу");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLUMN_STORAGE_KEY);
      if (!saved) return;
      const keys = JSON.parse(saved) as ColumnKey[];
      const allowed = new Set(COLUMN_DEFS.map((column) => column.key));
      const next = new Set<ColumnKey>(keys.filter((key) => allowed.has(key)));
      COLUMN_DEFS.filter((column) => column.always).forEach((column) => next.add(column.key));
      if (next.size > 0) setVisibleColumns(next);
    } catch {
      // Column preferences are cosmetic; ignore broken local storage.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch {
      // Nothing critical: table still works with default columns.
    }
  }, [visibleColumns]);

  useAdminPageHeader({
    title: "Массовый редактор",
    subtitle: "Товары, категории, SEO, варианты, цены и наличие",
    badge: "Прайс",
    backHref: "/admin/products",
    backLabel: "Товары",
    contextKey: "products-table-editor",
  });

  useAdminPageActions({
    onRefresh: load,
    actions: [
      {
        id: "back-products",
        label: "Товары",
        icon: ArrowLeft,
        href: "/admin/products",
        onClick: () => router.push("/admin/products"),
      },
      {
        id: "save-all-prices",
        label: "Сохранить все",
        icon: Save,
        variant: "primary",
        disabled: savingAll || Object.keys(drafts).length === 0,
        onClick: () => void saveAll(),
      },
    ],
  });

  const rows = useMemo(() => flattenProducts(products), [products]);
  const dirtyRows = useMemo(() => rows.filter((row) => isRowDirty(row, drafts)), [rows, drafts]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    return rows
      .filter((row) => {
        if (categoryId !== "ALL" && row.categoryId !== categoryId) return false;
        if (unit === "CUBE" && !Number(row.pricePerCube)) return false;
        if (unit === "SQUARE" && !Number(row.pricePerSquareMeter)) return false;
        if (unit === "PIECE" && !Number(row.pricePerPiece)) return false;
        if (status === "ACTIVE" && (!row.productActive || !row.inStock)) return false;
        if (status === "HIDDEN" && row.productActive) return false;
        if (status === "NO_PRICE" && hasPositivePrice(row)) return false;
        if (status === "OUT" && row.inStock) return false;
        if (featuredFilter === "FEATURED" && !row.productFeatured) return false;
        if (featuredFilter === "PLAIN" && row.productFeatured) return false;
        if (!normalizedQuery) return true;
        return [
          row.productName,
          row.productSlug,
          row.categoryName,
          row.productTags,
          row.productShortDescription,
          row.size,
          saleUnitLabel(row.saleUnit),
        ]
          .join(" ")
          .toLocaleLowerCase("ru-RU")
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aValue = sortValue(a, sortKey);
        const bValue = sortValue(b, sortKey);
        const result =
          typeof aValue === "number" && typeof bValue === "number"
            ? aValue - bValue
            : String(aValue).localeCompare(String(bValue), "ru", { numeric: true });
        if (result !== 0) return sortDirection === "asc" ? result : -result;
        return `${a.categoryName} ${a.productName} ${a.size}`.localeCompare(
          `${b.categoryName} ${b.productName} ${b.size}`,
          "ru",
          { numeric: true }
        );
      });
  }, [categoryId, featuredFilter, query, rows, sortDirection, sortKey, status, unit]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(row.variantId)), [rows, selectedIds]);
  const selectedDirtyRows = useMemo(
    () => selectedRows.filter((row) => isRowDirty(row, drafts)),
    [drafts, selectedRows]
  );
  const visibleSelectedCount = visibleRows.filter((row) => selectedIds.has(row.variantId)).length;
  const allVisibleSelected = visibleRows.length > 0 && visibleSelectedCount === visibleRows.length;
  const activeBulkField = BULK_FIELDS.find((field) => field.value === bulkField) ?? BULK_FIELDS[0];
  const bulkTargetRows = bulkScope === "selected" ? selectedRows : bulkScope === "visible" ? visibleRows : filteredRows;
  const availableBulkModes = useMemo<BulkMode[]>(
    () =>
      activeBulkField.kind === "boolean" || activeBulkField.kind === "category" || activeBulkField.kind === "saleUnit"
        ? ["set"]
        : activeBulkField.kind === "text"
          ? ["set", "replaceText"]
          : ["set", "clear", "increasePercent", "decreasePercent", "increaseAmount", "decreaseAmount"],
    [activeBulkField.kind]
  );

  useEffect(() => {
    setPage(1);
  }, [categoryId, featuredFilter, query, status, unit]);

  useEffect(() => {
    if (!availableBulkModes.includes(bulkMode)) {
      setBulkMode(availableBulkModes[0]);
    }
  }, [availableBulkModes, bulkMode]);

  function updateDraft(variantId: string, field: DraftField, value: string) {
    setDrafts((current) => ({
      ...current,
      [variantId]: {
        ...(current[variantId] ?? {}),
        [field]: value,
      },
    }));
  }

  function changeBulkField(field: DraftField) {
    const nextField = BULK_FIELDS.find((item) => item.value === field);
    setBulkField(field);
    setBulkMode("set");
    setBulkValue(
      field === "inStock" || field === "productActive" || field === "productFeatured"
        ? "true"
        : nextField?.kind === "saleUnit"
          ? "BOTH"
          : nextField?.kind === "category"
            ? categories[0]?.id ?? ""
            : ""
    );
    setBulkReplaceValue("");
  }

  function toggleSelected(variantId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  }

  function selectRows(targetRows: Row[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      targetRows.forEach((row) => next.add(row.variantId));
      return next;
    });
  }

  function toggleVisibleSelection() {
    if (allVisibleSelected) {
      setSelectedIds((current) => {
        const next = new Set(current);
        visibleRows.forEach((row) => next.delete(row.variantId));
        return next;
      });
      return;
    }
    selectRows(visibleRows);
  }

  function resetRows(targetRows: Row[]) {
    if (targetRows.length === 0) return;
    setDrafts((current) => {
      const next = { ...current };
      targetRows.forEach((row) => delete next[row.variantId]);
      return next;
    });
  }

  function resetRow(row: Row) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[row.variantId];
      return next;
    });
  }

  function computeBulkValue(row: Row, field: DraftField, draftsSource: Record<string, Draft>) {
    const current = rowInputValue(row, draftsSource, field);

    if (activeBulkField.kind === "boolean") {
      return bulkValue === "false" ? "false" : "true";
    }
    if (activeBulkField.kind === "category" || activeBulkField.kind === "saleUnit") {
      return bulkValue.trim();
    }

    if (bulkMode === "replaceText") {
      if (!bulkValue) return null;
      return current.replaceAll(bulkValue, bulkReplaceValue);
    }

    if (bulkMode === "clear") return "";
    if (bulkMode === "set") return bulkValue.trim();

    const currentNumber = Number(String(current || "0").replace(",", "."));
    const changeNumber = Number(bulkValue.replace(",", "."));
    if (!Number.isFinite(currentNumber) || !Number.isFinite(changeNumber)) return null;

    let nextNumber = currentNumber;
    if (bulkMode === "increasePercent") nextNumber = currentNumber * (1 + changeNumber / 100);
    if (bulkMode === "decreasePercent") nextNumber = currentNumber * (1 - changeNumber / 100);
    if (bulkMode === "increaseAmount") nextNumber = currentNumber + changeNumber;
    if (bulkMode === "decreaseAmount") nextNumber = currentNumber - changeNumber;
    if (nextNumber < 0) nextNumber = 0;
    return Number.isInteger(nextNumber) ? String(nextNumber) : nextNumber.toFixed(2).replace(/\.?0+$/, "");
  }

  function applyBulkEdit() {
    if (bulkTargetRows.length === 0) {
      setMessage("Сначала выберите строки или расширьте фильтр.");
      return;
    }

    if (activeBulkField.kind !== "boolean" && bulkMode !== "clear" && bulkMode !== "replaceText" && !bulkValue.trim()) {
      setMessage("Укажите значение для массового изменения.");
      return;
    }

    if (bulkMode === "replaceText" && !bulkValue) {
      setMessage("Укажите, какой текст заменить в размере.");
      return;
    }

    let changed = 0;
    const nextDrafts = { ...drafts };
    for (const row of bulkTargetRows) {
      const nextValue = computeBulkValue(row, bulkField, nextDrafts);
      if (nextValue === null) continue;
      if (normalizeComparable(nextValue) === normalizeComparable(rowInputValue(row, nextDrafts, bulkField))) continue;
      nextDrafts[row.variantId] = {
        ...(nextDrafts[row.variantId] ?? {}),
        [bulkField]: nextValue,
      };
      changed += 1;
    }
    setDrafts(nextDrafts);

    setMessage(
      changed > 0
        ? `Применено к строкам: ${changed}. Проверьте подсветку и нажмите «Сохранить».`
        : "Подходящих строк для изменения не нашлось."
    );
  }

  async function saveRow(row: Row) {
    const payload = buildPatchPayload(row, drafts);
    if (Object.keys(payload).length <= 1) {
      resetRow(row);
      return;
    }
    setSaving(row.variantId);
    setMessage(null);
    try {
      if (Object.keys(payload).length > 1) {
        const res = await fetch("/api/admin/products/quick-edit", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Не удалось сохранить строку");
        }
        setProducts((current) =>
          applySavedProduct(current, data.product).map((product) => ({
            ...product,
            variants: (product.variants ?? []).map((variant) =>
              variant.id === row.variantId && data.variant ? { ...variant, ...data.variant } : variant
            ),
          }))
        );
      }
      resetRow(row);
      setSavedId(row.variantId);
      window.setTimeout(() => setSavedId((current) => (current === row.variantId ? null : current)), 1400);
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Ошибка сохранения");
      throw saveError;
    } finally {
      setSaving(null);
    }
  }

  async function saveAll() {
    if (dirtyRows.length === 0) return;
    setSavingAll(true);
    setMessage(null);
    try {
      for (const row of dirtyRows) {
        await saveRow(row);
      }
      setMessage(`Сохранено строк: ${dirtyRows.length}`);
    } catch {
      // saveRow already set a clear message.
    } finally {
      setSavingAll(false);
    }
  }

  async function saveSelected() {
    if (selectedDirtyRows.length === 0) return;
    setSavingAll(true);
    setMessage(null);
    try {
      for (const row of selectedDirtyRows) {
        await saveRow(row);
      }
      setMessage(`Сохранено выбранных строк: ${selectedDirtyRows.length}`);
    } catch {
      // saveRow already set a clear message.
    } finally {
      setSavingAll(false);
    }
  }

  function toggleProduct(row: Row) {
    updateDraft(row.variantId, "productActive", effectiveBoolean(row, drafts, "productActive") ? "false" : "true");
  }

  function toggleStock(row: Row) {
    updateDraft(row.variantId, "inStock", effectiveBoolean(row, drafts, "inStock") ? "false" : "true");
  }

  function toggleFeatured(row: Row) {
    updateDraft(row.variantId, "productFeatured", effectiveBoolean(row, drafts, "productFeatured") ? "false" : "true");
  }

  function rowInput(row: Row, field: DraftField) {
    return rowInputValue(row, drafts, field);
  }

  function columnVisible(column: ColumnKey) {
    return visibleColumns.has(column);
  }

  function toggleColumn(column: ColumnKey) {
    const definition = COLUMN_DEFS.find((item) => item.key === column);
    if (definition?.always) return;
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  function renderSortButton(label: string, key: SortKey) {
    return (
      <button
        type="button"
        onClick={() => changeSort(key)}
        className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === key ? "text-primary" : ""}`} />
      </button>
    );
  }

  const statNoPrice = rows.filter((row) => !hasPositivePrice(row)).length;
  const statHidden = rows.filter((row) => !row.productActive || !row.inStock).length;

  if (loading) {
    return (
      <div className="admin-page-frame admin-page-frame-fluid">
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-card">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-foreground">Открываю таблицу цен</p>
              <p className="mt-1 text-sm text-muted-foreground">Товары, варианты, цены и наличие</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-frame admin-page-frame-fluid">
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <p className="mt-4 font-semibold text-foreground">Таблица не открылась</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4" />
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-page-frame admin-page-frame-fluid pb-[var(--admin-products-table-dock-safe-area)]"
      style={
        {
          "--admin-products-table-dock-safe-area": "calc(8rem + env(safe-area-inset-bottom, 0px))",
        } as CSSProperties
      }
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
              <Table2 className="h-3.5 w-3.5 text-primary" />
              {rows.length.toLocaleString("ru-RU")} вариантов
            </span>
            <span className="rounded-full border border-border px-3 py-1">{products.length.toLocaleString("ru-RU")} товаров</span>
            <span className="rounded-full border border-border px-3 py-1">{statNoPrice.toLocaleString("ru-RU")} без цены</span>
            <span className="rounded-full border border-border px-3 py-1">{statHidden.toLocaleString("ru-RU")} скрыто/нет в наличии</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Меняйте товар, категорию, SEO, размеры и цены прямо в строке. На сайт попадает только сохранённая правка.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={dirtyRows.length === 0 || savingAll}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить все
            </button>
            <button
              type="button"
              onClick={() => setDrafts({})}
              disabled={dirtyRows.length === 0 || savingAll}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Сбросить
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Несохранённых строк: <span className="font-semibold text-foreground">{dirtyRows.length}</span>
          </p>
        </div>
      </div>

      <div className="sticky top-[72px] z-20 mb-4 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
        <div className="grid gap-2 xl:grid-cols-[minmax(240px,1fr)_180px_140px_170px_150px_170px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск: товар, размер, категория, SEO, теги..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="ALL">Все категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as typeof unit)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="ALL">Все ед.</option>
            <option value="CUBE">м³</option>
            <option value="SQUARE">м²</option>
            <option value="PIECE">шт</option>
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="ALL">Все статусы</option>
            <option value="ACTIVE">На сайте</option>
            <option value="HIDDEN">Товар скрыт</option>
            <option value="OUT">Нет в наличии</option>
            <option value="NO_PRICE">Без цены</option>
          </select>
          <select
            value={featuredFilter}
            onChange={(event) => setFeaturedFilter(event.target.value as typeof featuredFilter)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="ALL">Все витрины</option>
            <option value="FEATURED">Рекомендуемые</option>
            <option value="PLAIN">Обычные</option>
          </select>
          <select
            value={`${sortKey}:${sortDirection}`}
            onChange={(event) => {
              const [nextKey, nextDirection] = event.target.value.split(":") as [SortKey, SortDirection];
              setSortKey(nextKey);
              setSortDirection(nextDirection);
            }}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="categoryName:asc">Категория А-Я</option>
            <option value="productName:asc">Товар А-Я</option>
            <option value="size:asc">Размер ↑</option>
            <option value="pricePerCube:asc">м³ дешевле</option>
            <option value="pricePerCube:desc">м³ дороже</option>
            <option value="pricePerSquareMeter:asc">м² дешевле</option>
            <option value="pricePerPiece:asc">шт дешевле</option>
            <option value="variantSortOrder:asc">Порядок ↑</option>
          </select>
          <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filteredRows.length.toLocaleString("ru-RU")} строк
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColumns((current) => !current)}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent"
          >
            <Columns3 className="h-4 w-4 text-primary" />
            Колонки
          </button>
          <button
            type="button"
            onClick={() => setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS))}
            className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent"
          >
            Минимум
          </button>
          <button
            type="button"
            onClick={() => setVisibleColumns(new Set(COLUMN_DEFS.map((column) => column.key)))}
            className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent"
          >
            Все поля
          </button>
          <span className="text-xs text-muted-foreground">
            Видно колонок: {visibleColumns.size} · сортировка {sortDirection === "asc" ? "по возрастанию" : "по убыванию"}
          </span>
        </div>
        {showColumns && (
          <div className="mt-3 grid gap-2 rounded-xl border border-border bg-background/70 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {COLUMN_DEFS.map((column) => (
              <label
                key={column.key}
                className={`flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold ${
                  visibleColumns.has(column.key) ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                } ${column.always ? "opacity-70" : "cursor-pointer hover:bg-accent"}`}
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.has(column.key)}
                  disabled={column.always}
                  onChange={() => toggleColumn(column.key)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                {column.label}
              </label>
            ))}
          </div>
        )}
        {message && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            {message}
          </div>
        )}
      </div>

      <section className="mb-4 rounded-2xl border border-primary/20 bg-card p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
          <div className="rounded-xl border border-border bg-background/55 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">
                Выбрано: <span className="ml-1 text-foreground">{selectedRows.length.toLocaleString("ru-RU")}</span>
              </span>
              <button
                type="button"
                onClick={toggleVisibleSelection}
                className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent"
              >
                {allVisibleSelected ? "Снять страницу" : "Выбрать страницу"}
              </button>
              <button
                type="button"
                onClick={() => selectRows(filteredRows)}
                disabled={filteredRows.length === 0}
                className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-45"
              >
                Все найденные
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedRows.length === 0}
                className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-45"
              >
                Очистить выбор
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => resetRows(selectedRows)}
                disabled={selectedRows.length === 0 || savingAll}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-45"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Отменить выбранные
              </button>
              <button
                type="button"
                onClick={() => void saveSelected()}
                disabled={selectedDirtyRows.length === 0 || savingAll}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-45"
              >
                {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Сохранить выбранные
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/55 p-3">
            <div className="grid gap-2 lg:grid-cols-[150px_150px_150px_minmax(130px,1fr)_auto]">
              <select
                value={bulkScope}
                onChange={(event) => setBulkScope(event.target.value as BulkScope)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value="selected">Выбранные</option>
                <option value="visible">Страница</option>
                <option value="filtered">Все найденные</option>
              </select>
              <select
                value={bulkField}
                onChange={(event) => changeBulkField(event.target.value as DraftField)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
              >
                {BULK_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
              <select
                value={bulkMode}
                onChange={(event) => setBulkMode(event.target.value as BulkMode)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
              >
                {availableBulkModes.includes("set") && <option value="set">Установить</option>}
                {availableBulkModes.includes("clear") && <option value="clear">Очистить</option>}
                {availableBulkModes.includes("increasePercent") && <option value="increasePercent">+ процент</option>}
                {availableBulkModes.includes("decreasePercent") && <option value="decreasePercent">- процент</option>}
                {availableBulkModes.includes("increaseAmount") && <option value="increaseAmount">+ сумма</option>}
                {availableBulkModes.includes("decreaseAmount") && <option value="decreaseAmount">- сумма</option>}
                {availableBulkModes.includes("replaceText") && <option value="replaceText">Заменить текст</option>}
              </select>

              {activeBulkField.kind === "category" ? (
                <select
                  value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : activeBulkField.kind === "saleUnit" ? (
                <select
                  value={bulkValue || "BOTH"}
                  onChange={(event) => setBulkValue(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                >
                  <option value="BOTH">Смешанная</option>
                  <option value="CUBE">м³</option>
                  <option value="SQUARE">м²</option>
                  <option value="PIECE">шт</option>
                </select>
              ) : activeBulkField.kind === "boolean" ? (
                <select
                  value={bulkValue || "true"}
                  onChange={(event) => setBulkValue(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                >
                  {bulkField === "inStock" ? (
                    <>
                      <option value="true">В наличии</option>
                      <option value="false">Нет в наличии</option>
                    </>
                  ) : bulkField === "productFeatured" ? (
                    <>
                      <option value="true">Рекомендуемый</option>
                      <option value="false">Обычный</option>
                    </>
                  ) : (
                    <>
                      <option value="true">Показывать</option>
                      <option value="false">Скрыть</option>
                    </>
                  )}
                </select>
              ) : bulkMode === "replaceText" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={bulkValue}
                    onChange={(event) => setBulkValue(event.target.value)}
                    placeholder="Найти"
                    className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                  />
                  <input
                    value={bulkReplaceValue}
                    onChange={(event) => setBulkReplaceValue(event.target.value)}
                    placeholder="Заменить на"
                    className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <input
                  value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  placeholder={bulkMode.includes("Percent") ? "10" : "Значение"}
                  disabled={bulkMode === "clear"}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary disabled:opacity-45"
                />
              )}

              <button
                type="button"
                onClick={applyBulkEdit}
                disabled={bulkTargetRows.length === 0}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-45"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Применить
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Массовая правка сначала попадает в подсветку. На сайте изменится только после сохранения.
              Цель: {bulkTargetRows.length.toLocaleString("ru-RU")} строк.
            </p>
          </div>
        </div>
      </section>

      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <table className="w-full min-w-[1500px] border-collapse text-sm">
          <thead className="sticky top-[154px] z-10 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
            <tr>
              {columnVisible("select") && (
                <th className={`${getColumnWidth("select")} px-4 py-3 text-left`}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleSelection}
                    aria-label="Выбрать строки на странице"
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </th>
              )}
              {columnVisible("product") && <th className={`${getColumnWidth("product")} px-4 py-3 text-left`}>{renderSortButton("Товар", "productName")}</th>}
              {columnVisible("category") && <th className={`${getColumnWidth("category")} px-3 py-3 text-left`}>{renderSortButton("Категория", "categoryName")}</th>}
              {columnVisible("seo") && <th className={`${getColumnWidth("seo")} px-3 py-3 text-left`}>SEO</th>}
              {columnVisible("tags") && <th className={`${getColumnWidth("tags")} px-3 py-3 text-left`}>Теги / фильтры</th>}
              {columnVisible("saleUnit") && <th className={`${getColumnWidth("saleUnit")} px-3 py-3 text-left`}>Ед.</th>}
              {columnVisible("featured") && <th className={`${getColumnWidth("featured")} px-3 py-3 text-left`}>Витрина</th>}
              {columnVisible("size") && <th className={`${getColumnWidth("size")} px-3 py-3 text-left`}>{renderSortButton("Размер", "size")}</th>}
              {columnVisible("pricePerCube") && <th className={`${getColumnWidth("pricePerCube")} px-3 py-3 text-left`}>{renderSortButton("м³", "pricePerCube")}</th>}
              {columnVisible("pricePerSquareMeter") && <th className={`${getColumnWidth("pricePerSquareMeter")} px-3 py-3 text-left`}>{renderSortButton("м²", "pricePerSquareMeter")}</th>}
              {columnVisible("pricePerPiece") && <th className={`${getColumnWidth("pricePerPiece")} px-3 py-3 text-left`}>{renderSortButton("шт", "pricePerPiece")}</th>}
              {columnVisible("piecesPerCube") && <th className={`${getColumnWidth("piecesPerCube")} px-3 py-3 text-left`}>шт/м³</th>}
              {columnVisible("stockQty") && <th className={`${getColumnWidth("stockQty")} px-3 py-3 text-left`}>{renderSortButton("Остаток", "stockQty")}</th>}
              {columnVisible("variantSortOrder") && <th className={`${getColumnWidth("variantSortOrder")} px-3 py-3 text-left`}>{renderSortButton("Порядок", "variantSortOrder")}</th>}
              {columnVisible("status") && <th className={`${getColumnWidth("status")} px-3 py-3 text-left`}>Статус</th>}
              {columnVisible("action") && <th className={`${getColumnWidth("action")} px-3 py-3 text-right`}>Действие</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const dirty = isRowDirty(row, drafts);
              const rowSaving = saving === row.variantId;
              const isSelected = selectedIds.has(row.variantId);
              const productIsActive = effectiveBoolean(row, drafts, "productActive");
              const stockIsActive = effectiveBoolean(row, drafts, "inStock");
              const featuredIsActive = effectiveBoolean(row, drafts, "productFeatured");
              return (
                <tr key={row.variantId} className={`border-t border-border/70 ${dirty ? "bg-primary/5" : isSelected ? "bg-primary/[0.025]" : ""}`}>
                  {columnVisible("select") && (
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(row.variantId)}
                        aria-label={`Выбрать ${row.productName}`}
                        className="mt-2 h-4 w-4 rounded border-border accent-primary"
                      />
                    </td>
                  )}
                  {columnVisible("product") && (
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <CellInput
                            value={rowInput(row, "productName")}
                            onChange={(value) => updateDraft(row.variantId, "productName", value)}
                            ariaLabel={`Название ${row.productName}`}
                            className="font-semibold"
                          />
                          <p className="mt-1 truncate text-xs text-muted-foreground">{row.categoryName} · {saleUnitLabel(row.saleUnit)}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Link href={`/admin/products/${row.productId}`} className="inline-flex items-center gap-1 rounded-xl border border-border px-2 py-1 text-xs font-semibold hover:bg-accent">
                              Править
                            </Link>
                            <Link href={`/product/${row.productSlug}`} target="_blank" className="inline-flex items-center gap-1 rounded-xl border border-border px-2 py-1 text-xs font-semibold hover:bg-accent">
                              На сайте <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleProduct(row)}
                          disabled={Boolean(saving)}
                          className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-2 py-1 text-xs font-semibold ${
                            productIsActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                              : "border-muted-foreground/25 bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {productIsActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {productIsActive ? "активен" : "скрыт"}
                        </button>
                      </div>
                    </td>
                  )}
                  {columnVisible("category") && (
                    <td className="px-3 py-3 align-top">
                      <CellSelect
                        value={rowInput(row, "categoryId")}
                        onChange={(value) => updateDraft(row.variantId, "categoryId", value)}
                        ariaLabel={`Категория ${row.productName}`}
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </CellSelect>
                    </td>
                  )}
                  {columnVisible("seo") && (
                    <td className="px-3 py-3 align-top">
                      <div className="grid gap-2">
                        <CellInput
                          value={rowInput(row, "productSlug")}
                          onChange={(value) => updateDraft(row.variantId, "productSlug", value)}
                          ariaLabel="SEO slug"
                        />
                        <CellTextarea
                          value={rowInput(row, "shortDescription")}
                          onChange={(value) => updateDraft(row.variantId, "shortDescription", value)}
                          ariaLabel="SEO краткое описание"
                          rows={2}
                        />
                        <CellTextarea
                          value={rowInput(row, "description")}
                          onChange={(value) => updateDraft(row.variantId, "description", value)}
                          ariaLabel="Описание товара"
                          rows={2}
                        />
                      </div>
                    </td>
                  )}
                  {columnVisible("tags") && (
                    <td className="px-3 py-3 align-top">
                      <CellTextarea
                        value={rowInput(row, "productTags")}
                        onChange={(value) => updateDraft(row.variantId, "productTags", value)}
                        ariaLabel="Теги и фильтры"
                        rows={2}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">До 3 тегов через запятую</p>
                    </td>
                  )}
                  {columnVisible("saleUnit") && (
                    <td className="px-3 py-3 align-top">
                      <CellSelect
                        value={rowInput(row, "saleUnit")}
                        onChange={(value) => updateDraft(row.variantId, "saleUnit", value)}
                        ariaLabel="Единица продажи"
                      >
                        <option value="BOTH">Смешанная</option>
                        <option value="CUBE">м³</option>
                        <option value="SQUARE">м²</option>
                        <option value="PIECE">шт</option>
                      </CellSelect>
                    </td>
                  )}
                  {columnVisible("featured") && (
                    <td className="px-3 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(row)}
                        disabled={Boolean(saving)}
                        className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-3 text-xs font-semibold ${
                          featuredIsActive
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {featuredIsActive ? "рекоменд." : "обычный"}
                      </button>
                    </td>
                  )}
                  {columnVisible("size") && (
                    <td className="px-3 py-3 align-top">
                      <CellInput
                        value={rowInput(row, "size")}
                        onChange={(value) => updateDraft(row.variantId, "size", value)}
                        ariaLabel={`Размер ${row.productName}`}
                      />
                    </td>
                  )}
                  {columnVisible("pricePerCube") && (
                    <td className="px-3 py-3 align-top">
                      <CellInput
                        value={rowInput(row, "pricePerCube")}
                        onChange={(value) => updateDraft(row.variantId, "pricePerCube", value)}
                        ariaLabel="Цена за м³"
                      />
                    </td>
                  )}
                  {columnVisible("pricePerSquareMeter") && (
                    <td className="px-3 py-3 align-top">
                      <CellInput
                        value={rowInput(row, "pricePerSquareMeter")}
                        onChange={(value) => updateDraft(row.variantId, "pricePerSquareMeter", value)}
                        ariaLabel="Цена за м²"
                      />
                    </td>
                  )}
                  {columnVisible("pricePerPiece") && (
                    <td className="px-3 py-3 align-top">
                      <CellInput
                        value={rowInput(row, "pricePerPiece")}
                        onChange={(value) => updateDraft(row.variantId, "pricePerPiece", value)}
                        ariaLabel="Цена за штуку"
                      />
                    </td>
                  )}
                  {columnVisible("piecesPerCube") && (
                    <td className="px-3 py-3 align-top">
                      <CellInput
                        value={rowInput(row, "piecesPerCube")}
                        onChange={(value) => updateDraft(row.variantId, "piecesPerCube", value)}
                        ariaLabel="Штук в кубе"
                      />
                    </td>
                  )}
                  {columnVisible("stockQty") && (
                    <td className="px-3 py-3 align-top">
                      <CellInput
                        value={rowInput(row, "stockQty")}
                        onChange={(value) => updateDraft(row.variantId, "stockQty", value)}
                        ariaLabel="Остаток"
                      />
                    </td>
                  )}
                  {columnVisible("variantSortOrder") && (
                    <td className="px-3 py-3 align-top">
                      <CellInput
                        value={rowInput(row, "variantSortOrder")}
                        onChange={(value) => updateDraft(row.variantId, "variantSortOrder", value)}
                        ariaLabel="Порядок варианта"
                      />
                    </td>
                  )}
                  {columnVisible("status") && (
                    <td className="px-3 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => toggleStock(row)}
                        disabled={Boolean(saving)}
                        className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-3 text-xs font-semibold ${
                          stockIsActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {stockIsActive ? "в наличии" : "нет"}
                      </button>
                    </td>
                  )}
                  {columnVisible("action") && (
                    <td className="px-3 py-3 text-right align-top">
                      <div className="flex justify-end gap-2">
                        {dirty && (
                          <button
                            type="button"
                            onClick={() => resetRow(row)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-accent"
                            aria-label="Сбросить строку"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void saveRow(row)}
                          disabled={!dirty || rowSaving || savingAll}
                          className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {rowSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : savedId === row.variantId ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {savedId === row.variantId ? "Готово" : "Сохранить"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleRows.map((row) => {
          const dirty = isRowDirty(row, drafts);
          const rowSaving = saving === row.variantId;
          const isSelected = selectedIds.has(row.variantId);
          const productIsActive = effectiveBoolean(row, drafts, "productActive");
          const stockIsActive = effectiveBoolean(row, drafts, "inStock");
          const featuredIsActive = effectiveBoolean(row, drafts, "productFeatured");
          return (
            <div key={row.variantId} className={`rounded-2xl border border-border bg-card p-3 ${dirty ? "ring-1 ring-primary/40" : isSelected ? "ring-1 ring-primary/20" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(row.variantId)}
                    aria-label={`Выбрать ${row.productName}`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
                  />
                  <div className="min-w-0">
                    <CellInput
                      value={rowInput(row, "productName")}
                      onChange={(value) => updateDraft(row.variantId, "productName", value)}
                      ariaLabel={`Название ${row.productName}`}
                      className="font-semibold"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{row.categoryName} · {saleUnitLabel(row.saleUnit)}</p>
                  </div>
                </div>
                {!hasPositivePrice(row) && (
                  <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                    без цены
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CellSelect
                  value={rowInput(row, "categoryId")}
                  onChange={(value) => updateDraft(row.variantId, "categoryId", value)}
                  ariaLabel="Категория"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </CellSelect>
                <CellSelect
                  value={rowInput(row, "saleUnit")}
                  onChange={(value) => updateDraft(row.variantId, "saleUnit", value)}
                  ariaLabel="Единица продажи"
                >
                  <option value="BOTH">Смешанная</option>
                  <option value="CUBE">м³</option>
                  <option value="SQUARE">м²</option>
                  <option value="PIECE">шт</option>
                </CellSelect>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CellInput value={rowInput(row, "size")} onChange={(value) => updateDraft(row.variantId, "size", value)} ariaLabel="Размер" />
                <CellInput value={rowInput(row, "piecesPerCube")} onChange={(value) => updateDraft(row.variantId, "piecesPerCube", value)} ariaLabel="Штук в кубе" />
                <CellInput value={rowInput(row, "pricePerCube")} onChange={(value) => updateDraft(row.variantId, "pricePerCube", value)} ariaLabel="Цена за м³" />
                <CellInput value={rowInput(row, "pricePerSquareMeter")} onChange={(value) => updateDraft(row.variantId, "pricePerSquareMeter", value)} ariaLabel="Цена за м²" />
                <CellInput value={rowInput(row, "pricePerPiece")} onChange={(value) => updateDraft(row.variantId, "pricePerPiece", value)} ariaLabel="Цена за штуку" />
                <CellInput value={rowInput(row, "stockQty")} onChange={(value) => updateDraft(row.variantId, "stockQty", value)} ariaLabel="Остаток" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleStock(row)}
                  disabled={Boolean(saving)}
                  className={`min-h-10 flex-1 rounded-xl border px-3 text-xs font-semibold ${
                    stockIsActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {stockIsActive ? "В наличии" : "Нет в наличии"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleProduct(row)}
                  disabled={Boolean(saving)}
                  className="min-h-10 flex-1 rounded-xl border border-border px-3 text-xs font-semibold"
                >
                  {productIsActive ? "На сайте" : "Скрыт"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleFeatured(row)}
                  disabled={Boolean(saving)}
                  className={`min-h-10 flex-1 rounded-xl border px-3 text-xs font-semibold ${
                    featuredIsActive ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {featuredIsActive ? "Рекоменд." : "Обычный"}
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/admin/products/${row.productId}`} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border text-xs font-semibold">
                  Карточка
                </Link>
                <button
                  type="button"
                  onClick={() => void saveRow(row)}
                  disabled={!dirty || rowSaving || savingAll}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-45"
                >
                  {rowSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Сохранить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRows.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Ничего не найдено</p>
          <p className="mt-1 text-sm text-muted-foreground">Попробуйте очистить поиск или фильтры.</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <p className="text-sm text-muted-foreground">
          Показано {visibleRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}-
          {Math.min(page * PAGE_SIZE, filteredRows.length)} из {filteredRows.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-45"
          >
            Назад
          </button>
          <span className="text-sm font-semibold text-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-45"
          >
            Дальше
          </button>
        </div>
      </div>

      {dirtyRows.length > 0 && (
        <div
          className="fixed left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-background/95 p-3 shadow-2xl backdrop-blur"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Есть несохранённые правки</p>
            <p className="text-xs text-muted-foreground">
              {dirtyRows.length} строк ждут сохранения
              {selectedDirtyRows.length > 0 ? ` · выбранных ${selectedDirtyRows.length}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedDirtyRows.length > 0 && (
              <button
                type="button"
                onClick={() => void saveSelected()}
                disabled={savingAll}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-primary/40 px-4 text-sm font-semibold text-primary disabled:opacity-45"
              >
                {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Выбранные
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={savingAll}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Сохранить все
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
