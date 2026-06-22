"use client";

import { useState, useRef, useMemo, useCallback, useEffect, useDeferredValue } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Package, CheckCircle2, XCircle, FileDown,
  Printer, ChevronDown, Pencil, Minus, LayoutList, LayoutGrid,
  Settings2, Check, Bell, Search, Download, Info, AlertTriangle,
  History, Zap, Upload, Loader2, RefreshCw,
} from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type Variant = {
  id: string;
  size: string;
  pricePerCube: unknown;
  pricePerPiece: unknown;
  pricePerSquareMeter: unknown;
  inStock: boolean;
  stockQty: number | null;
  lowStockThreshold?: number;
  product: {
    id: string;
    name: string;
    slug: string;
    saleUnit: string;
    category: { name: string };
  };
};

type EditField = "stockQty" | "pricePerCube" | "pricePerPiece" | "pricePerSquareMeter";

type ColKey = "category" | "size" | "pricePerCube" | "pricePerSquareMeter" | "pricePerPiece" | "stockQty" | "status";
type StatusFilter = "all" | "in" | "out" | "tracked" | "low";

type InventoryImportVariant = {
  id: string;
  inStock: boolean;
  stockQty: number | null;
  lowStockThreshold: number;
  pricePerCube: number | string | null;
  pricePerPiece: number | string | null;
  pricePerSquareMeter: number | string | null;
};

type InventoryImportResult = {
  ok?: boolean;
  preview?: boolean;
  updated?: number;
  rows?: number;
  errors?: string[];
  error?: string;
  variants?: InventoryImportVariant[];
};

type InventoryMovementItem = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: "CUBE" | "PIECE";
  quantity: number;
  stockUnits: number;
  before: number;
  after: number;
};

type InventoryMovement = {
  id: string;
  action: "apply" | "release";
  orderId: string | null;
  orderNumber: number | null;
  source: string | null;
  createdAt: string;
  totalStockUnits: number;
  items: InventoryMovementItem[];
};

const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: "category",     label: "Категория" },
  { key: "size",         label: "Размер" },
  { key: "pricePerCube", label: "Цена м³" },
  { key: "pricePerSquareMeter", label: "Цена м²" },
  { key: "pricePerPiece",label: "Цена шт" },
  { key: "stockQty",     label: "Остаток" },
  { key: "status",       label: "Статус" },
];

const DEFAULT_COLS: ColKey[] = ["category","size","pricePerCube","pricePerSquareMeter","pricePerPiece","stockQty","status"];
const LS_KEY = "inventory_visible_cols";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Все позиции",
  in: "В наличии",
  out: "Нет в наличии",
  tracked: "С учетом остатка",
  low: "Ниже порога",
};

const ROW_BATCH = 180;

function fmt(n: unknown) {
  if (n === null || n === undefined || n === "") return null;
  const num = Number(n);
  return isNaN(num) ? null : num.toLocaleString("ru-RU") + " ₽";
}

function hasThreshold(v: Variant) {
  return Boolean(v.lowStockThreshold && v.lowStockThreshold > 0);
}

function isLowStock(v: Variant) {
  return hasThreshold(v) && v.stockQty !== null && v.stockQty <= (v.lowStockThreshold ?? 0);
}

function isEffectivelyInStock(v: Variant) {
  return v.stockQty === null ? v.inStock : v.stockQty > 0;
}

function stockStatusForExport(v: Variant) {
  if (v.stockQty === 0) return "Нет в наличии (остаток 0)";
  return isEffectivelyInStock(v) ? "В наличии" : "Нет в наличии";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatMovementDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function movementActionLabel(action: InventoryMovement["action"]) {
  return action === "release" ? "Возврат" : "Списание";
}

function movementUnitLabel(item: InventoryMovementItem) {
  return item.unitType === "CUBE"
    ? `${item.quantity.toLocaleString("ru-RU")} м³`
    : `${item.quantity.toLocaleString("ru-RU")} шт.`;
}

/* ── Stock badge — defined OUTSIDE main component so React doesn't remount it ── */
function StockBadge({ v, onToggle }: { v: Variant; onToggle: () => void }) {
  const buttonClass = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 px-2 text-xs font-medium transition-opacity hover:opacity-70 print:pointer-events-none";

  if (v.stockQty === 0) return (
    <button
      onClick={onToggle}
      title={v.inStock
        ? "Остаток 0 не считается наличием. Нажмите, чтобы снять устаревший флаг."
        : "Остаток 0 не считается наличием. Увеличьте остаток, чтобы вернуть позицию в наличие."}
      className={`${buttonClass} text-destructive`}
    >
      <XCircle className="w-3.5 h-3.5" /> 0 шт. · Нет
    </button>
  );
  if (v.stockQty !== null && v.stockQty > 0) return (
    <button
      onClick={onToggle}
      title="Статус считается по учтенному остатку. Чтобы снять с наличия, поставьте остаток 0."
      className={`${buttonClass} text-primary`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" /> {v.stockQty} шт.
    </button>
  );
  return v.inStock ? (
    <button onClick={onToggle} title="Нажмите чтобы скрыть" className={`${buttonClass} text-primary`}>
      <CheckCircle2 className="w-3.5 h-3.5" /> В наличии
    </button>
  ) : (
    <button onClick={onToggle} title="Нажмите чтобы показать" className={`${buttonClass} text-destructive`}>
      <XCircle className="w-3.5 h-3.5" /> Нет в наличии
    </button>
  );
}

/* ── Editable cell — also outside main component ── */
function EditCell({
  v, field, display, placeholder, editing, saving,
  onStartEdit, onSave, onCancel,
}: {
  v: Variant; field: EditField; display: string | null; placeholder?: string;
  editing: { id: string; field: EditField } | null;
  saving: string | null;
  onStartEdit: (id: string, field: EditField, cur: unknown) => void;
  onSave: (id: string, field: EditField, rawValue: string) => void;
  onCancel: () => void;
}) {
  const isEditing = editing?.id === v.id && editing?.field === field;
  const isSaving  = saving === v.id && isEditing;
  const curVal = v[field];
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!isEditing) return;
    committedRef.current = false;
    setDraft(curVal !== null && curVal !== undefined ? String(curVal) : "");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isEditing, curVal]);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onSave(v.id, field, draft);
  };

  if (isSaving) return <span className="text-muted-foreground text-xs animate-pulse">…</span>;

  if (isEditing) return (
    <input
      ref={inputRef}
      type="number" min={0}
      value={draft}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { e.preventDefault(); committedRef.current = true; onCancel(); }
      }}
      className="w-24 min-h-[44px] px-2 py-1 text-sm text-right border-2 border-primary rounded-xl focus:outline-none bg-background"
    />
  );

  return (
    <button
      onClick={() => onStartEdit(v.id, field, curVal)}
      title="Нажмите для изменения"
      className={`group flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 px-1 text-sm transition-all hover:text-primary ${display ? "font-medium" : "text-muted-foreground"}`}
    >
      {display ?? <Minus className="w-3 h-3" />}
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  );
}

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground  animate-in slide-in-from-bottom-2 fade-in duration-200 sm:bottom-6
      ${type === "ok" ? "bg-primary" : "bg-destructive"}`}>
      {type === "ok" ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

export function InventoryClient({ variants: init }: { variants: Variant[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [variants, setVariants] = useState(init);

  // Записать/очистить URL param ?status=
  const setStatusFilter = useCallback((key: StatusFilter) => {
    const params = new URLSearchParams(window.location.search);
    if (key === "all") params.delete("status"); else params.set("status", key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname]);
  const [search, setSearch] = useState("");
  // Статус фильтр из URL — синхронизирован со Smart Command Bar чипсами
  const rawStatus = searchParams.get("status");
  const filterStatus: StatusFilter =
    rawStatus === "in" || rawStatus === "out" || rawStatus === "tracked" || rawStatus === "low"
      ? rawStatus
      : "all";
  const [filterCat, setFilterCat] = useState("all");
  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_COLS));
  const [thresholdModal, setThresholdModal] = useState<{ variant: Variant; value: string } | null>(null);
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [pendingStatusToggle, setPendingStatusToggle] = useState<Variant | null>(null);
  const [statusToggleSaving, setStatusToggleSaving] = useState(false);
  const [renderLimit, setRenderLimit] = useState(ROW_BATCH);
  const [isCompact, setIsCompact] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importingStock, setImportingStock] = useState(false);
  const [inventoryImportFile, setInventoryImportFile] = useState<File | null>(null);
  const [inventoryImportResult, setInventoryImportResult] = useState<InventoryImportResult | null>(null);
  const [confirmInventoryImport, setConfirmInventoryImport] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  /* load col visibility from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setVisibleCols(new Set(JSON.parse(saved) as ColKey[]));
    } catch { /* ignore */ }
  }, []);

  /* close col menu on outside click */
  useEffect(() => {
    if (!showColMenu) return;
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColMenu]);

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      localStorage.setItem(LS_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const col = (key: ColKey) => visibleCols.has(key);

  const showToast = useCallback((msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadInventoryMovements = useCallback(async (announce = false) => {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const res = await fetch("/api/admin/inventory/movements?limit=8", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setMovementsError(data?.error || "Журнал движения недоступен");
        return;
      }
      setMovements(Array.isArray(data.movements) ? data.movements : []);
      if (announce) showToast("Журнал обновлён", "ok");
    } catch {
      setMovementsError("Не удалось загрузить журнал");
    } finally {
      setMovementsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadInventoryMovements();
  }, [loadInventoryMovements]);

  const cats = useMemo(() => Array.from(new Set(variants.map(v => v.product.category.name))).sort(), [variants]);

  const totals = useMemo(() => variants.reduce(
    (acc, v) => {
      if (isEffectivelyInStock(v)) acc.totalIn += 1;
      else acc.totalOut += 1;
      if (v.stockQty !== null) acc.tracked += 1;
      if (isLowStock(v)) acc.lowStock += 1;
      return acc;
    },
    { totalIn: 0, totalOut: 0, tracked: 0, lowStock: 0 }
  ), [variants]);
  const { totalIn, totalOut, tracked, lowStock } = totals;

  const filtered = useMemo(() => variants.filter(v => {
    const s = deferredSearch.trim().toLowerCase();
    const matchS = !s || v.product.name.toLowerCase().includes(s) || v.size.toLowerCase().includes(s) || v.product.category.name.toLowerCase().includes(s);
    const matchF =
      filterStatus === "all" ||
      (filterStatus === "in"      && isEffectivelyInStock(v)) ||
      (filterStatus === "out"     && !isEffectivelyInStock(v)) ||
      (filterStatus === "tracked" && v.stockQty !== null) ||
      (filterStatus === "low"     && isLowStock(v));
    const matchC = filterCat === "all" || v.product.category.name === filterCat;
    return matchS && matchF && matchC;
  }), [variants, deferredSearch, filterStatus, filterCat]);

  useEffect(() => {
    setRenderLimit(ROW_BATCH);
  }, [deferredSearch, filterStatus, filterCat, view]);

  useEffect(() => {
    const beforePrint = () => setRenderLimit(Number.MAX_SAFE_INTEGER);
    const afterPrint = () => setRenderLimit(ROW_BATCH);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const visibleRows = useMemo(() => filtered.slice(0, renderLimit), [filtered, renderLimit]);
  const hasMoreRows = renderLimit < filtered.length;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /* ── patch helper ── */
  const patchVariant = useCallback(async (variantId: string, body: Record<string, unknown>, label?: string) => {
    setSaving(variantId);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setVariants(vs => vs.map(v => v.id === variantId ? {
          ...v,
          inStock: data.stockQty === 0 ? false : data.inStock,
          stockQty: data.stockQty,
          pricePerCube: data.pricePerCube,
          pricePerPiece: data.pricePerPiece,
          pricePerSquareMeter: data.pricePerSquareMeter,
          lowStockThreshold: data.lowStockThreshold ?? v.lowStockThreshold,
        } : v));
        if (label) showToast(`Сохранено: ${label}`, "ok");
        return true;
      } else {
        showToast(data?.error || "Ошибка сохранения", "err");
        return false;
      }
    } catch {
      showToast("Нет соединения с сервером", "err");
      return false;
    } finally {
      setSaving(null);
    }
  }, [showToast]);

  /* ── inline edit ── */
  const startEdit = useCallback((id: string, field: EditField, currentVal: unknown) => {
    setEditing({ id, field });
  }, []);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const saveEdit = useCallback(async (id: string, field: EditField, rawValue: string) => {
    if (!editing || editing.id !== id || editing.field !== field) return;
    setEditing(null);
    const raw = rawValue.trim();

    if (field === "stockQty") {
      const stockQty = raw === "" ? null : parseInt(raw, 10);
      if (raw !== "" && (isNaN(stockQty!) || stockQty! < 0)) {
        showToast("Остаток: число от 0", "err");
        return;
      }
      const curVariant = variants.find(v => v.id === id);
      if (!curVariant) return;
      const newInStock = stockQty === null ? curVariant.inStock : stockQty > 0;
      setVariants(vs => vs.map(v => v.id === id ? { ...v, stockQty, inStock: newInStock } : v));
      const ok = await patchVariant(id, { stockQty }, `остаток ${stockQty ?? "—"}`);
      if (!ok) setVariants(vs => vs.map(v => v.id === id ? curVariant : v));
    } else {
      const price = raw === "" ? null : parseFloat(raw.replace(/\s/g, "").replace(",", "."));
      if (raw !== "" && (isNaN(price!) || price! < 0)) {
        showToast("Цена: число от 0", "err");
        return;
      }
      const curVariant = variants.find(v => v.id === id);
      if (!curVariant) return;
      setVariants(vs => vs.map(v => v.id === id ? { ...v, [field]: price } : v));
      const label =
        field === "pricePerCube"
          ? `цена м³ ${price ?? "—"}`
          : field === "pricePerSquareMeter"
            ? `цена м² ${price ?? "—"}`
            : `цена шт ${price ?? "—"}`;
      const ok = await patchVariant(id, { [field]: price }, label);
      if (!ok) setVariants(vs => vs.map(v => v.id === id ? curVariant : v));
    }
  }, [editing, variants, patchVariant, showToast]);

  /* ── status toggle ── */
  const applyStatusToggle = useCallback(async (v: Variant) => {
    if (v.stockQty !== null) {
      if (v.stockQty === 0 && v.inStock) {
        setVariants(vs => vs.map(x => x.id === v.id ? { ...x, inStock: false } : x));
        const ok = await patchVariant(v.id, { inStock: false }, "Нет в наличии");
        if (!ok) setVariants(vs => vs.map(x => x.id === v.id ? v : x));
        return;
      }
      showToast(
        v.stockQty === 0
          ? "Остаток 0: сначала увеличьте количество"
          : "Статус считается по остатку. Чтобы снять наличие, поставьте 0",
        "err"
      );
      return;
    }
    const newInStock = !v.inStock;
    setVariants(vs => vs.map(x => x.id === v.id ? { ...x, inStock: newInStock } : x));
    const ok = await patchVariant(v.id, { inStock: newInStock }, newInStock ? "В наличии" : "Нет в наличии");
    if (!ok) setVariants(vs => vs.map(x => x.id === v.id ? v : x));
  }, [patchVariant, showToast]);

  const requestStatusToggle = useCallback((v: Variant) => {
    if (v.stockQty !== null && !(v.stockQty === 0 && v.inStock)) {
      showToast(
        v.stockQty === 0
          ? "Остаток 0: сначала увеличьте количество"
          : "Статус считается по остатку. Чтобы снять наличие, поставьте 0",
        "err"
      );
      return;
    }
    setPendingStatusToggle(v);
  }, [showToast]);

  const confirmStatusToggle = useCallback(async () => {
    if (!pendingStatusToggle) return;
    setStatusToggleSaving(true);
    try {
      await applyStatusToggle(pendingStatusToggle);
      setPendingStatusToggle(null);
    } finally {
      setStatusToggleSaving(false);
    }
  }, [applyStatusToggle, pendingStatusToggle]);

  /* ── threshold save ── */
  const saveThreshold = useCallback(async () => {
    if (!thresholdModal) return;
    const raw = thresholdModal.value.trim();
    const n = raw === "" ? 0 : parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 100000) {
      showToast("Порог: число от 0 до 100000", "err");
      return;
    }
    const variantId = thresholdModal.variant.id;
    setThresholdSaving(true);
    try {
      const res = await fetch("/api/admin/inventory/threshold", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, threshold: n }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(data?.error || "Не удалось сохранить порог", "err");
        setThresholdSaving(false);
        return;
      }
      setVariants(vs => vs.map(x => x.id === variantId ? { ...x, lowStockThreshold: n } : x));
      showToast(n === 0 ? "Порог отключён" : `Порог: ${n} шт.`, "ok");
      setThresholdModal(null);
    } catch {
      showToast("Нет соединения с сервером", "err");
    } finally {
      setThresholdSaving(false);
    }
  }, [thresholdModal, showToast]);

  const exportCsv = useCallback(() => {
    const headers = [
      "id",
      "Категория",
      "Товар",
      "Размер",
      "Цена м³",
      "Цена м²",
      "Цена шт",
      "Остаток",
      "Статус",
      "Порог",
    ];
    const rows = filtered.map((v) => [
      v.id,
      v.product.category.name,
      v.product.name,
      v.size,
      v.pricePerCube ?? "",
      v.pricePerSquareMeter ?? "",
      v.pricePerPiece ?? "",
      v.stockQty ?? "",
      stockStatusForExport(v),
      v.lowStockThreshold ?? 0,
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pilorus-ostatki-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Экспортировано: ${filtered.length} позиций`, "ok");
  }, [filtered, showToast]);

  const submitInventoryImport = useCallback(async (file: File, preview: boolean) => {
    setImportingStock(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (preview) formData.append("preview", "1");

      const res = await fetch("/api/admin/inventory/import", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({})) as InventoryImportResult;
      setInventoryImportResult(data);
      if (!res.ok || !data?.ok) {
        const details = Array.isArray(data?.errors) && data.errors.length > 1
          ? ` Ещё ошибок: ${data.errors.length - 1}.`
          : "";
        showToast(`${data?.error || "Импорт не выполнен"}${details}`, "err");
        return;
      }

      if (preview) {
        setConfirmInventoryImport(false);
        showToast(`Проверено: ${Number(data.updated || 0)} позиций`, "ok");
        return;
      }

      const updated = new Map<string, InventoryImportVariant>(
        (Array.isArray(data.variants) ? data.variants : []).map((variant: InventoryImportVariant) => [variant.id, variant]),
      );
      setVariants((current) => current.map((variant) => {
        const next = updated.get(variant.id);
        return next
          ? {
              ...variant,
              inStock: next.inStock,
              stockQty: next.stockQty,
              lowStockThreshold: next.lowStockThreshold,
              pricePerCube: next.pricePerCube,
              pricePerPiece: next.pricePerPiece,
              pricePerSquareMeter: next.pricePerSquareMeter,
            }
          : variant;
      }));
      router.refresh();
      setInventoryImportFile(null);
      setInventoryImportResult(null);
      setConfirmInventoryImport(false);
      showToast(`Импортировано: ${Number(data.updated || 0)} позиций`, "ok");
    } catch {
      showToast(preview ? "Не удалось проверить CSV" : "Не удалось загрузить CSV", "err");
    } finally {
      setImportingStock(false);
    }
  }, [router, showToast]);

  const handleInventoryImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setInventoryImportFile(file);
    setInventoryImportResult(null);
    setConfirmInventoryImport(false);
    await submitInventoryImport(file, true);
  }, [submitInventoryImport]);

  const applyInventoryImport = useCallback(() => {
    if (!inventoryImportFile) {
      showToast("Сначала выберите CSV", "err");
      return;
    }
    void submitInventoryImport(inventoryImportFile, false);
  }, [inventoryImportFile, showToast, submitInventoryImport]);

  const handlePrint = useCallback(() => {
    setRenderLimit(Number.MAX_SAFE_INTEGER);
    setView("table");
    window.setTimeout(() => window.print(), 40);
  }, []);

  /* shared props for EditCell */
  const editProps = { editing, saving, onStartEdit: startEdit, onSave: saveEdit, onCancel: cancelEdit };

  /* colspan for empty state */
  const colCount = 2 + ALL_COLS.filter(c => visibleCols.has(c.key)).length + 1;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #inventory-print, #inventory-print * { visibility: visible !important; }
          #inventory-print { position: absolute; inset: 0; padding: 20px; }
          .no-print { display: none !important; }
          .print-hide { display: none !important; }
        }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="admin-page-frame admin-page-frame-fluid">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap no-print">
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold leading-tight">Склад / Остатки</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {variants.length} вариантов · {totalIn} в наличии · {totalOut} нет в наличии · {tracked} с учетом остатка
            </p>
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
            <button onClick={exportCsv} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-primary/5 transition-colors">
              <Download className="w-4 h-4 text-primary" /> Экспорт CSV
            </button>
            <button onClick={handlePrint} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-primary/5 transition-colors">
              <Printer className="w-4 h-4" /> PDF / Печать
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 no-print sm:grid-cols-5">
          {[
            { label: "Все позиции",      val: variants.length, color: "text-foreground",  key: "all" as const },
            { label: "В наличии",        val: totalIn,         color: "text-emerald-600", key: "in" as const  },
            { label: "Нет в наличии",    val: totalOut,        color: "text-destructive", key: "out" as const },
            { label: "С учетом остатка", val: tracked,         color: "text-primary",     key: "tracked" as const },
            { label: "Ниже порога",      val: lowStock,        color: "text-amber-600",   key: "low" as const },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className={`min-h-[68px] p-3 rounded-xl border text-left transition-colors ${filterStatus === s.key ? "border-primary/45 bg-primary/10" : "border-border bg-card hover:bg-primary/5"}`}>
              <p className={`text-xl font-bold leading-none ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 no-print lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по товару, размеру или категории"
              className="min-h-[44px] w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
          <div className="relative">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="min-h-[44px] max-w-[240px] appearance-none rounded-xl border border-border bg-background py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option value="all">Все категории</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Column visibility */}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setShowColMenu(p => !p)}
              className={`inline-flex min-h-[44px] items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors
                ${showColMenu ? "border-primary/45 bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-primary/5"}`}
            >
              <Settings2 className="w-4 h-4" /> Колонки
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-xl p-3 min-w-[180px] space-y-1">
                <p className="text-xs text-muted-foreground font-medium px-2 pb-1">Показать колонки</p>
                {ALL_COLS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => toggleCol(c.key)}
                    className="flex min-h-[44px] items-center gap-3 w-full px-2 py-1.5 rounded-xl text-sm hover:bg-primary/5 transition-colors text-left"
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${visibleCols.has(c.key) ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                      {visibleCols.has(c.key) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-1 rounded-xl border border-border bg-card p-1 sm:flex">
            <button title="Таблица" onClick={() => setView("table")} className={`min-h-[44px] min-w-[44px] rounded-xl p-1.5 transition-colors ${view === "table" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-primary/5"}`}><LayoutList className="w-4 h-4" /></button>
            <button title="Карточки" onClick={() => setView("cards")} className={`min-h-[44px] min-w-[44px] rounded-xl p-1.5 transition-colors ${view === "cards" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-primary/5"}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          </div>
        </div>

        {(filterStatus !== "all" || filterCat !== "all" || search.trim()) && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground no-print">
            <Info className="h-3.5 w-3.5 text-primary" />
            <span>
              Показано {filtered.length} из {variants.length}: {STATUS_FILTER_LABELS[filterStatus]}
              {filterCat !== "all" ? ` · ${filterCat}` : ""}
              {search.trim() ? ` · "${search.trim()}"` : ""}
            </span>
            <button
              onClick={() => { setSearch(""); setFilterCat("all"); setStatusFilter("all"); }}
              className="ml-auto min-h-[44px] rounded-xl px-2 text-primary hover:bg-primary/10"
            >
              Сбросить
            </button>
          </div>
        )}

        {/* Content */}
        <div id="inventory-print">
          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-xl font-bold">ПилоРус — Отчёт по остаткам</h2>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })} · {filtered.length} позиций</p>
          </div>

          {/* Mobile cards */}
          {isCompact && (
          <div className="space-y-2 no-print">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />Ничего не найдено
              </div>
            )}
            {visibleRows.map(v => {
              const belowThreshold = isLowStock(v);
              const inStock = isEffectivelyInStock(v);
              return (
              <div key={v.id} className={`bg-card border rounded-xl p-3 space-y-3 ${!inStock ? "opacity-65" : ""} ${belowThreshold ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{v.product.name}</p>
                    <p className="text-xs text-muted-foreground">{v.product.category.name} · <span className="font-mono">{v.size}</span></p>
                  </div>
                  <StockBadge v={v} onToggle={() => requestStatusToggle(v)} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {col("pricePerCube") && (
                    <div className="min-w-0">
                      <p className="text-muted-foreground mb-0.5">Цена м³</p>
                      <EditCell v={v} field="pricePerCube" display={fmt(v.pricePerCube)} placeholder="0" {...editProps} />
                    </div>
                  )}
                  {col("pricePerSquareMeter") && (
                    <div className="min-w-0">
                      <p className="text-muted-foreground mb-0.5">Цена м²</p>
                      <EditCell v={v} field="pricePerSquareMeter" display={fmt(v.pricePerSquareMeter)} placeholder="0" {...editProps} />
                    </div>
                  )}
                  {col("pricePerPiece") && (
                    <div className="min-w-0">
                      <p className="text-muted-foreground mb-0.5">Цена шт</p>
                      <EditCell v={v} field="pricePerPiece" display={fmt(v.pricePerPiece)} placeholder="0" {...editProps} />
                    </div>
                  )}
                  {col("stockQty") && (
                    <div className="min-w-0">
                      <p className="text-muted-foreground mb-0.5">Остаток</p>
                      <EditCell v={v} field="stockQty" display={v.stockQty !== null ? String(v.stockQty) : null} placeholder="шт" {...editProps} />
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <button
                    onClick={() => setThresholdModal({ variant: v, value: String(v.lowStockThreshold ?? 0) })}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                      hasThreshold(v)
                        ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                        : "border-border text-muted-foreground hover:bg-primary/5"
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {hasThreshold(v) ? `Порог: ≤ ${v.lowStockThreshold} шт.` : "Порог"}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          )}

          {/* Desktop cards */}
          {!isCompact && view === "cards" && (
          <div className="no-print grid grid-cols-2 gap-3 xl:grid-cols-3">
            {filtered.length === 0 && (
              <div className="col-span-full rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />Ничего не найдено
              </div>
            )}
            {visibleRows.map(v => {
              const belowThreshold = isLowStock(v);
              const inStock = isEffectivelyInStock(v);
              return (
                <div key={v.id} className={`rounded-xl border bg-card p-3 transition-colors ${!inStock ? "opacity-65" : ""} ${belowThreshold ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/products/${v.product.id}`} className="font-medium text-sm hover:text-primary transition-colors line-clamp-1">
                        {v.product.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{v.product.category.name} · <span className="font-mono">{v.size}</span></p>
                    </div>
                    <StockBadge v={v} onToggle={() => requestStatusToggle(v)} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs xl:grid-cols-4">
                    <div className="rounded-xl bg-muted/35 px-2 py-1.5">
                      <p className="text-muted-foreground">Цена м³</p>
                      <EditCell v={v} field="pricePerCube" display={fmt(v.pricePerCube)} placeholder="0" {...editProps} />
                    </div>
                    <div className="rounded-xl bg-muted/35 px-2 py-1.5">
                      <p className="text-muted-foreground">Цена м²</p>
                      <EditCell v={v} field="pricePerSquareMeter" display={fmt(v.pricePerSquareMeter)} placeholder="0" {...editProps} />
                    </div>
                    <div className="rounded-xl bg-muted/35 px-2 py-1.5">
                      <p className="text-muted-foreground">Цена шт</p>
                      <EditCell v={v} field="pricePerPiece" display={fmt(v.pricePerPiece)} placeholder="0" {...editProps} />
                    </div>
                    <div className="rounded-xl bg-muted/35 px-2 py-1.5">
                      <p className="text-muted-foreground">Остаток</p>
                      <EditCell v={v} field="stockQty" display={v.stockQty !== null ? String(v.stockQty) : null} placeholder="шт" {...editProps} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => setThresholdModal({ variant: v, value: String(v.lowStockThreshold ?? 0) })}
                      className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                        hasThreshold(v)
                          ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                          : "border-border text-muted-foreground hover:bg-primary/5"
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {hasThreshold(v) ? `Порог: ≤ ${v.lowStockThreshold} шт.` : "Порог"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Desktop table */}
          {!isCompact && view === "table" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Товар</th>
                    {col("category")      && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Категория</th>}
                    {col("size")          && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Размер</th>}
                    {col("pricePerCube")  && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Цена м³</th>}
                    {col("pricePerSquareMeter") && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Цена м²</th>}
                    {col("pricePerPiece") && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Цена шт</th>}
                    {col("stockQty")      && <th className="text-center px-4 py-3 font-medium text-muted-foreground">Остаток</th>}
                    {col("status")        && <th className="text-center px-4 py-3 font-medium text-muted-foreground print-hide">Статус</th>}
                    <th className="px-4 py-3 no-print" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr><td colSpan={colCount} className="text-center py-12 text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />Ничего не найдено
                    </td></tr>
                  )}
                  {visibleRows.map(v => {
                    const belowThreshold = isLowStock(v);
                    const inStock = isEffectivelyInStock(v);
                    return (
                    <tr key={v.id} className={`hover:bg-primary/[0.04] transition-colors ${!inStock ? "opacity-65" : ""} ${belowThreshold ? "bg-amber-500/[0.06]" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/products/${v.product.id}`} className="font-medium hover:text-primary transition-colors line-clamp-1">
                          {v.product.name}
                        </Link>
                      </td>
                      {col("category")      && <td className="px-4 py-3 text-muted-foreground text-xs">{v.product.category.name}</td>}
                      {col("size")          && <td className="px-4 py-3 font-mono text-xs">{v.size}</td>}
                      {col("pricePerCube")  && (
                        <td className="px-4 py-3 text-right">
                          <EditCell v={v} field="pricePerCube" display={fmt(v.pricePerCube)} placeholder="цена" {...editProps} />
                        </td>
                      )}
                      {col("pricePerSquareMeter") && (
                        <td className="px-4 py-3 text-right">
                          <EditCell v={v} field="pricePerSquareMeter" display={fmt(v.pricePerSquareMeter)} placeholder="цена" {...editProps} />
                        </td>
                      )}
                      {col("pricePerPiece") && (
                        <td className="px-4 py-3 text-right">
                          <EditCell v={v} field="pricePerPiece" display={fmt(v.pricePerPiece)} placeholder="цена" {...editProps} />
                        </td>
                      )}
                      {col("stockQty") && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <EditCell v={v} field="stockQty" display={v.stockQty !== null ? String(v.stockQty) : null} placeholder="шт" {...editProps} />
                          </div>
                        </td>
                      )}
                      {col("status") && (
                        <td className="px-4 py-3 text-center print-hide">
                          <StockBadge v={v} onToggle={() => requestStatusToggle(v)} />
                        </td>
                      )}
                      <td className="px-4 py-3 no-print">
                        <div className="flex items-center gap-1.5 justify-end whitespace-nowrap">
                          <button
                            onClick={() => setThresholdModal({ variant: v, value: String(v.lowStockThreshold ?? 0) })}
                            title={hasThreshold(v)
                              ? `Порог предупреждения: ${v.lowStockThreshold} шт.`
                              : "Настроить порог предупреждения"}
                            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 px-2 py-1 rounded-xl border text-xs transition-colors ${
                              hasThreshold(v)
                                ? "border-amber-500/40 text-amber-600 bg-amber-500/10 hover:bg-amber-500/15"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                            }`}
                          >
                            <Bell className="w-3 h-3" />
                            {hasThreshold(v) ? `≤ ${v.lowStockThreshold}` : "Порог"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Print summary */}
          <div className="hidden print:block mt-6 text-xs text-muted-foreground border-t pt-3">
            Всего: {variants.length} · В наличии: {totalIn} · Нет в наличии: {totalOut} · С учетом остатка: {tracked}
          </div>
        </div>

        {hasMoreRows && (
          <div className="no-print flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/70 p-4 text-center sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Показано {visibleRows.length} из {filtered.length}. Остальное подгружается порциями, чтобы склад не тормозил.
            </p>
            <button
              onClick={() => setRenderLimit((value) => value + ROW_BATCH)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              Показать ещё {Math.min(ROW_BATCH, filtered.length - visibleRows.length)}
            </button>
          </div>
        )}

        <section className="grid gap-3 no-print lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Автоматизация</h2>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Работает
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Остаток, цены и статус сохраняются inline. При остатке 0 статус становится “Нет в наличии”.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Bell className="h-4 w-4" /> Порог
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Порог подсвечивает строку и создает складскую задачу с системным уведомлением.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Beta
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Авто-списание, возврат и пороговые уведомления работают для учтённых остатков.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <History className="h-4 w-4 text-muted-foreground" /> Движение
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadInventoryMovements(true)}
                    disabled={movementsLoading}
                    className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                  >
                    {movementsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Обновить
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {movementsLoading && movements.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Загружаю журнал
                    </div>
                  ) : movementsError ? (
                    <div className="admin-alert admin-alert-warning rounded-xl px-3 py-2 text-xs">
                      {movementsError}
                    </div>
                  ) : movements.length === 0 ? (
                    <p className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                      Автоматических списаний и возвратов пока нет. Новые заказы появятся здесь сразу после обработки склада.
                    </p>
                  ) : (
                    movements.map((movement) => {
                      const isRelease = movement.action === "release";
                      const visibleItems = movement.items.slice(0, 3);
                      return (
                        <div key={movement.id} className="rounded-xl border border-border bg-background/70 p-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${isRelease ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                              {movementActionLabel(movement.action)}
                            </span>
                            {movement.orderId ? (
                              <Link href={`/admin/orders/${movement.orderId}`} className="font-semibold text-foreground hover:text-primary">
                                Заказ {movement.orderNumber ? `#${movement.orderNumber}` : movement.orderId.slice(0, 8)}
                              </Link>
                            ) : (
                              <span className="font-semibold text-foreground">
                                Заказ {movement.orderNumber ? `#${movement.orderNumber}` : "без номера"}
                              </span>
                            )}
                            <span className="text-muted-foreground">· {formatMovementDate(movement.createdAt)}</span>
                            <span className="ml-auto text-muted-foreground">{movement.totalStockUnits} шт.</span>
                          </div>
                          {visibleItems.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {visibleItems.map((item) => (
                                <div key={`${movement.id}-${item.variantId}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{item.productName}</span>
                                  {item.variantSize && <span className="font-mono">{item.variantSize}</span>}
                                  <span>{movementUnitLabel(item)}</span>
                                  <span className="text-muted-foreground/80">
                                    {item.before} → {item.after} шт.
                                  </span>
                                </div>
                              ))}
                              {movement.items.length > visibleItems.length && (
                                <p className="text-xs text-muted-foreground">Ещё позиций: {movement.items.length - visibleItems.length}</p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              В заказе не было позиций с учтённым остатком.
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Импорт / Экспорт</h2>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-start gap-2 rounded-xl bg-muted/30 p-3">
                <Download className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-muted-foreground">
                  Экспорт CSV выгружает текущий отфильтрованный список с остатком, статусом и порогом.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-muted/30 p-3">
                <Printer className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-muted-foreground">
                  PDF работает через печать браузера и использует тот же фильтр, что открыт на экране.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
                <Upload className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground">
                    CSV сначала проходит проверку. Остаток, статус и порог меняются только после отдельного подтверждения.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleInventoryImport}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      disabled={importingStock}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50 sm:w-auto"
                    >
                      {importingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {importingStock ? "Проверяю" : "Проверить CSV"}
                    </button>
                    <Link href="/admin/import" className="inline-flex min-h-[44px] items-center text-xs font-medium text-primary hover:underline">
                      Общий импорт товаров
                    </Link>
                  </div>
                  {inventoryImportFile && (
                    <div className="mt-3 rounded-xl border border-border bg-background/70 p-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2 text-foreground">
                        <Info className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate font-medium">{inventoryImportFile.name}</span>
                      </div>
                      {inventoryImportResult?.preview && (
                        <p className="mt-2 text-muted-foreground">
                          К обновлению: {Number(inventoryImportResult.updated || 0)} позиций. База ещё не изменена.
                        </p>
                      )}
                      {Array.isArray(inventoryImportResult?.errors) && inventoryImportResult.errors.length > 0 && (
                        <ul className="mt-2 space-y-1 text-destructive">
                          {inventoryImportResult.errors.slice(0, 3).map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      )}
                      {inventoryImportResult?.preview && Number(inventoryImportResult.updated || 0) > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!confirmInventoryImport ? (
                            <button
                              type="button"
                              onClick={() => setConfirmInventoryImport(true)}
                              disabled={importingStock}
                              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
                            >
                              <Check className="h-4 w-4" />
                              Применить проверенные изменения
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={applyInventoryImport}
                                disabled={importingStock}
                                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-destructive px-3 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 sm:w-auto"
                              >
                                {importingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                                Да, применить
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmInventoryImport(false)}
                                disabled={importingStock}
                                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50 sm:w-auto"
                              >
                                Отмена
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingStatusToggle)}
        onClose={() => { if (!statusToggleSaving) setPendingStatusToggle(null); }}
        onConfirm={confirmStatusToggle}
        title={pendingStatusToggle?.inStock ? "Снять позицию с наличия?" : "Вернуть позицию в наличие?"}
        description={pendingStatusToggle
          ? `${pendingStatusToggle.product.name} · ${pendingStatusToggle.size}. После подтверждения статус изменится сразу.`
          : undefined}
        confirmLabel={pendingStatusToggle?.inStock ? "Снять с наличия" : "Вернуть в наличие"}
        cancelLabel="Оставить как есть"
        variant="warning"
        loading={statusToggleSaving}
      />

      <AdminModal
        open={Boolean(thresholdModal)}
        onClose={() => { if (!thresholdSaving) setThresholdModal(null); }}
        title="Порог"
        subtitle="Когда остаток достигнет порога, склад получит задачу"
        size="sm"
        bodyClassName="space-y-4"
        footer={thresholdModal && (
          <>
            <button
              onClick={() => setThresholdModal(null)}
              disabled={thresholdSaving}
              className="min-h-[44px] flex-1 rounded-xl border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-primary/5 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={saveThreshold}
              disabled={thresholdSaving}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              {thresholdSaving ? (
                <><span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /> Сохранение</>
              ) : (
                <><Check className="w-4 h-4" /> Сохранить</>
              )}
            </button>
          </>
        )}
      >
        {thresholdModal && (
          <>
            <div className="bg-muted/40 border border-border rounded-xl p-3 text-sm">
              <p className="font-medium text-foreground line-clamp-1">{thresholdModal.variant.product.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {thresholdModal.variant.product.category.name} · <span className="font-mono">{thresholdModal.variant.size}</span>
                {thresholdModal.variant.stockQty !== null && (
                  <> · Сейчас: <span className="font-medium text-foreground">{thresholdModal.variant.stockQty} шт.</span></>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Порог (шт.)
              </label>
              <input
                type="number"
                min={0}
                max={100000}
                autoFocus
                value={thresholdModal.value}
                onChange={(e) => setThresholdModal(m => m ? { ...m, value: e.target.value } : m)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); saveThreshold(); }
                  if (e.key === "Escape") { e.preventDefault(); if (!thresholdSaving) setThresholdModal(null); }
                }}
                placeholder="Например, 5"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-2">
                0 — отключить предупреждение. При остатке ≤ порога строка подсветится, а в задачах появится пополнение.
              </p>
            </div>
          </>
        )}
      </AdminModal>
    </>
  );
}
