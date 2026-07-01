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
  | "lowStockThreshold";

type Draft = Partial<Record<DraftField, string>>;

const EDITABLE_FIELDS: DraftField[] = [
  "size",
  "pricePerCube",
  "pricePerSquareMeter",
  "pricePerPiece",
  "piecesPerCube",
  "stockQty",
  "lowStockThreshold",
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
    payload[field] = field === "size" ? nextValue : nextValue === "" ? null : nextValue;
  }
  return payload;
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

  useEffect(() => {
    setPage(1);
  }, [categoryId, query, status, unit]);

  function updateDraft(variantId: string, field: DraftField, value: string) {
    setDrafts((current) => ({
      ...current,
      [variantId]: {
        ...(current[variantId] ?? {}),
        [field]: value,
      },
    }));
  }

  function resetRow(row: Row) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[row.variantId];
      return next;
    });
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

  async function toggleProduct(row: Row) {
    const nextActive = !row.productActive;
    setSaving(row.variantId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products/quick-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_active", productId: row.productId, active: nextActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Не удалось изменить активность товара");
      setProducts((current) =>
        current.map((product) => (product.id === row.productId ? { ...product, active: nextActive } : product))
      );
    } catch (toggleError) {
      setMessage(toggleError instanceof Error ? toggleError.message : "Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  }

  async function toggleStock(row: Row) {
    const nextStock = !row.inStock;
    setSaving(row.variantId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products/quick-edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: row.variantId, inStock: nextStock }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Не удалось изменить наличие");
      setProducts((current) =>
        current.map((product) => ({
          ...product,
          variants: (product.variants ?? []).map((variant) =>
            variant.id === row.variantId ? { ...variant, inStock: nextStock } : variant
          ),
        }))
      );
    } catch (toggleError) {
      setMessage(toggleError instanceof Error ? toggleError.message : "Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  }

  function rowInput(row: Row, field: DraftField) {
    const draft = draftForRow(row, drafts);
    return field in draft ? draft[field] ?? "" : originalValue(row, field);
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

      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead className="sticky top-[154px] z-10 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
            <tr>
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
              return (
                <tr key={row.variantId} className={`border-t border-border/70 ${dirty ? "bg-primary/5" : ""}`}>
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
                        onClick={() => void toggleProduct(row)}
                        disabled={Boolean(saving)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
                          row.productActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : "border-muted-foreground/25 bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {row.productActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {row.productActive ? "активен" : "скрыт"}
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
                      onClick={() => void toggleStock(row)}
                      disabled={Boolean(saving)}
                      className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-3 text-xs font-semibold ${
                        row.inStock
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {row.inStock ? "в наличии" : "нет"}
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
          return (
            <div key={row.variantId} className={`rounded-2xl border border-border bg-card p-3 ${dirty ? "ring-1 ring-primary/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{row.productName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.categoryName} · {saleUnitLabel(row.saleUnit)}</p>
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
                  onClick={() => void toggleStock(row)}
                  disabled={Boolean(saving)}
                  className={`min-h-10 flex-1 rounded-xl border px-3 text-xs font-semibold ${
                    row.inStock
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {row.inStock ? "В наличии" : "Нет в наличии"}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleProduct(row)}
                  disabled={Boolean(saving)}
                  className="min-h-10 flex-1 rounded-xl border border-border px-3 text-xs font-semibold"
                >
                  {row.productActive ? "На сайте" : "Скрыт"}
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
          className="fixed left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-background/95 p-3 shadow-2xl backdrop-blur"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Есть несохранённые правки</p>
            <p className="text-xs text-muted-foreground">{dirtyRows.length} строк ждут сохранения</p>
          </div>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={savingAll}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Сохранить
          </button>
        </div>
      )}
    </div>
  );
}
