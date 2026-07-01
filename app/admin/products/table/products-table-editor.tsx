"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
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
  inStock: boolean;
};

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  saleUnit: SaleUnit;
  active: boolean;
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
  inStock: boolean;
};

type DraftField =
  | "size"
  | "pricePerCube"
  | "pricePerSquareMeter"
  | "pricePerPiece"
  | "piecesPerCube"
  | "stockQty"
  | "lowStockThreshold"
  | "inStock"
  | "productActive";

type Draft = Partial<Record<DraftField, string>>;

type BulkMode = "set" | "clear" | "increasePercent" | "decreasePercent" | "increaseAmount" | "decreaseAmount" | "replaceText";
type BulkScope = "selected" | "visible" | "filtered";

const EDITABLE_FIELDS: DraftField[] = [
  "size",
  "pricePerCube",
  "pricePerSquareMeter",
  "pricePerPiece",
  "piecesPerCube",
  "stockQty",
  "lowStockThreshold",
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
  "inStock",
]);

const BULK_FIELDS: { value: DraftField; label: string; kind: "text" | "number" | "boolean" }[] = [
  { value: "pricePerCube", label: "Цена м³", kind: "number" },
  { value: "pricePerSquareMeter", label: "Цена м²", kind: "number" },
  { value: "pricePerPiece", label: "Цена шт", kind: "number" },
  { value: "piecesPerCube", label: "Шт/м³", kind: "number" },
  { value: "stockQty", label: "Остаток", kind: "number" },
  { value: "size", label: "Размер", kind: "text" },
  { value: "inStock", label: "Наличие", kind: "boolean" },
  { value: "productActive", label: "Показ на сайте", kind: "boolean" },
];

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
      inStock: variant.inStock,
    }))
  );
}

function draftForRow(row: Row, drafts: Record<string, Draft>) {
  return drafts[row.variantId] ?? {};
}

function originalValue(row: Row, field: DraftField) {
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
    if (!VARIANT_FIELDS.has(field)) continue;
    if (!(field in draft)) continue;
    const nextValue = normalizeComparable(draft[field]);
    if (nextValue === normalizeComparable(originalValue(row, field))) continue;
    payload[field] = field === "size" ? nextValue : field === "inStock" ? nextValue === "true" : nextValue === "" ? null : nextValue;
  }
  return payload;
}

function productActiveChanged(row: Row, drafts: Record<string, Draft>) {
  const draft = draftForRow(row, drafts);
  return "productActive" in draft && normalizeComparable(draft.productActive) !== normalizeComparable(originalValue(row, "productActive"));
}

function effectiveBoolean(row: Row, drafts: Record<string, Draft>, field: "inStock" | "productActive") {
  return rowInputValue(row, drafts, field) === "true";
}

function rowInputValue(row: Row, drafts: Record<string, Draft>, field: DraftField) {
  const draft = draftForRow(row, drafts);
  return field in draft ? draft[field] ?? "" : originalValue(row, field);
}

function updateRowsAfterVariantSave(rows: Row[], variantId: string, variant: Partial<ApiVariant>) {
  return rows.map((row) =>
    row.variantId === variantId
      ? {
          ...row,
          size: variant.size ?? row.size,
          pricePerCube: variant.pricePerCube ?? null,
          pricePerSquareMeter: variant.pricePerSquareMeter ?? null,
          pricePerPiece: variant.pricePerPiece ?? null,
          piecesPerCube: variant.piecesPerCube ?? null,
          stockQty: variant.stockQty ?? null,
          lowStockThreshold: variant.lowStockThreshold ?? 0,
          inStock: variant.inStock ?? row.inStock,
        }
      : row
  );
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

  useAdminPageHeader({
    title: "Таблица цен",
    subtitle: "Быстрая правка вариантов, цен и наличия",
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
        if (!normalizedQuery) return true;
        return [
          row.productName,
          row.productSlug,
          row.categoryName,
          row.size,
          saleUnitLabel(row.saleUnit),
        ]
          .join(" ")
          .toLocaleLowerCase("ru-RU")
          .includes(normalizedQuery);
      })
      .sort((a, b) =>
        `${a.categoryName} ${a.productName} ${a.size}`.localeCompare(
          `${b.categoryName} ${b.productName} ${b.size}`,
          "ru",
          { numeric: true }
        )
      );
  }, [categoryId, query, rows, status, unit]);

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
      activeBulkField.kind === "boolean"
        ? ["set"]
        : activeBulkField.kind === "text"
          ? ["set", "replaceText"]
          : ["set", "clear", "increasePercent", "decreasePercent", "increaseAmount", "decreaseAmount"],
    [activeBulkField.kind]
  );

  useEffect(() => {
    setPage(1);
  }, [categoryId, query, status, unit]);

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
    setBulkField(field);
    setBulkMode("set");
    setBulkValue(field === "inStock" || field === "productActive" ? "true" : "");
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
    const shouldUpdateProductActive = productActiveChanged(row, drafts);
    if (Object.keys(payload).length <= 1 && !shouldUpdateProductActive) {
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
        if (data.variant) {
          setProducts((current) =>
            current.map((product) => ({
              ...product,
              variants: (product.variants ?? []).map((variant) =>
                variant.id === row.variantId ? { ...variant, ...data.variant } : variant
              ),
            }))
          );
        } else {
          setProducts((current) =>
            current.map((product) => ({
              ...product,
              variants: updateRowsAfterVariantSave(
                (product.variants ?? []).map((variant) => ({
                  productId: product.id,
                  productName: product.name,
                  productSlug: product.slug,
                  productActive: product.active,
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
                  inStock: variant.inStock,
                })),
                row.variantId,
                payload
              ).map((updatedRow) => ({
                id: updatedRow.variantId,
                size: updatedRow.size,
                pricePerCube: updatedRow.pricePerCube,
                pricePerSquareMeter: updatedRow.pricePerSquareMeter,
                pricePerPiece: updatedRow.pricePerPiece,
                piecesPerCube: updatedRow.piecesPerCube,
                stockQty: updatedRow.stockQty,
                lowStockThreshold: updatedRow.lowStockThreshold,
                inStock: updatedRow.inStock,
              })),
            }))
          );
        }
      }

      if (shouldUpdateProductActive) {
        const nextActive = rowInputValue(row, drafts, "productActive") === "true";
        const res = await fetch("/api/admin/products/quick-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggle_active", productId: row.productId, active: nextActive }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Не удалось изменить активность товара");
        }
        setProducts((current) =>
          current.map((product) => (product.id === row.productId ? { ...product, active: nextActive } : product))
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

  function rowInput(row: Row, field: DraftField) {
    return rowInputValue(row, drafts, field);
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
            Меняйте цены и размеры прямо в строке. На сайт попадает только сохранённая правка.
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
        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_140px_170px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск: товар, размер, категория..."
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
          <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filteredRows.length.toLocaleString("ru-RU")} строк
          </div>
        </div>
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

              {activeBulkField.kind === "boolean" ? (
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
        <table className="w-full min-w-[1360px] border-collapse text-sm">
          <thead className="sticky top-[154px] z-10 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
            <tr>
              <th className="w-[52px] px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleSelection}
                  aria-label="Выбрать строки на странице"
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </th>
              <th className="w-[300px] px-4 py-3 text-left">Товар</th>
              <th className="w-[170px] px-3 py-3 text-left">Размер</th>
              <th className="w-[120px] px-3 py-3 text-left">м³</th>
              <th className="w-[120px] px-3 py-3 text-left">м²</th>
              <th className="w-[120px] px-3 py-3 text-left">шт</th>
              <th className="w-[110px] px-3 py-3 text-left">шт/м³</th>
              <th className="w-[100px] px-3 py-3 text-left">остаток</th>
              <th className="w-[120px] px-3 py-3 text-left">статус</th>
              <th className="w-[150px] px-3 py-3 text-right">действие</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const dirty = isRowDirty(row, drafts);
              const rowSaving = saving === row.variantId;
              const isSelected = selectedIds.has(row.variantId);
              const productIsActive = effectiveBoolean(row, drafts, "productActive");
              const stockIsActive = effectiveBoolean(row, drafts, "inStock");
              return (
                <tr key={row.variantId} className={`border-t border-border/70 ${dirty ? "bg-primary/5" : isSelected ? "bg-primary/[0.025]" : ""}`}>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(row.variantId)}
                      aria-label={`Выбрать ${row.productName}`}
                      className="mt-2 h-4 w-4 rounded border-border accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{row.productName}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{row.categoryName} · {saleUnitLabel(row.saleUnit)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Link href={`/admin/products/${row.productId}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-accent">
                            Править
                          </Link>
                          <Link href={`/product/${row.productSlug}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-accent">
                            На сайте <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleProduct(row)}
                        disabled={Boolean(saving)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
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
                  <td className="px-3 py-3 align-top">
                    <CellInput
                      value={rowInput(row, "size")}
                      onChange={(value) => updateDraft(row.variantId, "size", value)}
                      ariaLabel={`Размер ${row.productName}`}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <CellInput
                      value={rowInput(row, "pricePerCube")}
                      onChange={(value) => updateDraft(row.variantId, "pricePerCube", value)}
                      ariaLabel="Цена за м³"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <CellInput
                      value={rowInput(row, "pricePerSquareMeter")}
                      onChange={(value) => updateDraft(row.variantId, "pricePerSquareMeter", value)}
                      ariaLabel="Цена за м²"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <CellInput
                      value={rowInput(row, "pricePerPiece")}
                      onChange={(value) => updateDraft(row.variantId, "pricePerPiece", value)}
                      ariaLabel="Цена за штуку"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <CellInput
                      value={rowInput(row, "piecesPerCube")}
                      onChange={(value) => updateDraft(row.variantId, "piecesPerCube", value)}
                      ariaLabel="Штук в кубе"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <CellInput
                      value={rowInput(row, "stockQty")}
                      onChange={(value) => updateDraft(row.variantId, "stockQty", value)}
                      ariaLabel="Остаток"
                    />
                  </td>
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
                    <p className="font-semibold text-foreground">{row.productName}</p>
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
