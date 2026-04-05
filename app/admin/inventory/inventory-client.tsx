"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Package, CheckCircle2, XCircle, FileDown,
  Printer, ChevronDown, Pencil, Minus, LayoutList, LayoutGrid,
  Settings2, Check,
} from "lucide-react";

type Variant = {
  id: string;
  size: string;
  pricePerCube: unknown;
  pricePerPiece: unknown;
  inStock: boolean;
  stockQty: number | null;
  product: {
    id: string;
    name: string;
    slug: string;
    saleUnit: string;
    category: { name: string };
  };
};

type EditField = "stockQty" | "pricePerCube" | "pricePerPiece";

type ColKey = "category" | "size" | "pricePerCube" | "pricePerPiece" | "stockQty" | "status";

const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: "category",     label: "Категория" },
  { key: "size",         label: "Размер" },
  { key: "pricePerCube", label: "Цена м³" },
  { key: "pricePerPiece",label: "Цена шт" },
  { key: "stockQty",     label: "Остаток" },
  { key: "status",       label: "Статус" },
];

const DEFAULT_COLS: ColKey[] = ["category","size","pricePerCube","pricePerPiece","stockQty","status"];
const LS_KEY = "inventory_visible_cols";

function fmt(n: unknown) {
  if (n === null || n === undefined || n === "") return null;
  const num = Number(n);
  return isNaN(num) ? null : num.toLocaleString("ru-RU") + " ₽";
}

/* ── Stock badge — defined OUTSIDE main component so React doesn't remount it ── */
function StockBadge({ v, onToggle }: { v: Variant; onToggle: () => void }) {
  if (v.stockQty === 0) return (
    <button onClick={onToggle} className="inline-flex items-center gap-1 text-destructive text-xs font-medium hover:opacity-70 transition-opacity print:pointer-events-none">
      <XCircle className="w-3.5 h-3.5" /> Нет (0)
    </button>
  );
  if (v.stockQty !== null && v.stockQty > 0) return (
    <button onClick={onToggle} className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium hover:opacity-70 transition-opacity print:pointer-events-none">
      <CheckCircle2 className="w-3.5 h-3.5" /> {v.stockQty} шт.
    </button>
  );
  return v.inStock ? (
    <button onClick={onToggle} title="Нажмите чтобы скрыть" className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium hover:opacity-70 transition-opacity print:pointer-events-none">
      <CheckCircle2 className="w-3.5 h-3.5" /> В наличии
    </button>
  ) : (
    <button onClick={onToggle} title="Нажмите чтобы показать" className="inline-flex items-center gap-1 text-destructive text-xs font-medium hover:opacity-70 transition-opacity print:pointer-events-none">
      <XCircle className="w-3.5 h-3.5" /> Нет
    </button>
  );
}

/* ── Editable cell — also outside main component ── */
function EditCell({
  v, field, display, placeholder, editing, editVal, saving, inputRef,
  onStartEdit, onChangeVal, onSave, onCancel,
}: {
  v: Variant; field: EditField; display: string | null; placeholder?: string;
  editing: { id: string; field: EditField } | null;
  editVal: string; saving: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onStartEdit: (id: string, field: EditField, cur: unknown) => void;
  onChangeVal: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isEditing = editing?.id === v.id && editing?.field === field;
  const isSaving  = saving === v.id && isEditing;

  if (isSaving) return <span className="text-muted-foreground text-xs animate-pulse">…</span>;

  if (isEditing) return (
    <input
      ref={inputRef}
      type="number" min={0}
      value={editVal}
      placeholder={placeholder}
      onChange={e => onChangeVal(e.target.value)}
      onBlur={onSave}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSave(); } if (e.key === "Escape") onCancel(); }}
      className="w-24 px-2 py-1 text-sm text-right border-2 border-primary rounded-lg focus:outline-none bg-background"
    />
  );

  const curVal = field === "stockQty" ? v.stockQty : field === "pricePerCube" ? v.pricePerCube : v.pricePerPiece;
  return (
    <button
      onClick={() => onStartEdit(v.id, field, curVal)}
      title="Нажмите для изменения"
      className={`group flex items-center gap-1 text-sm transition-all hover:text-primary ${display ? "font-medium" : "text-muted-foreground"}`}
    >
      {display ?? <Minus className="w-3 h-3" />}
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  );
}

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200
      ${type === "ok" ? "bg-emerald-600" : "bg-destructive"}`}>
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
  const setStatusFilter = useCallback((key: string) => {
    const params = new URLSearchParams(window.location.search);
    if (key === "all") params.delete("status"); else params.set("status", key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname]);
  const [search, setSearch] = useState("");
  // Статус фильтр из URL — синхронизирован со Smart Command Bar чипсами
  const urlStatus = searchParams.get("status") as "in" | "out" | "tracked" | null;
  const filterStatus = urlStatus || "all";
  const [filterCat, setFilterCat] = useState("all");
  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_COLS));
  const inputRef = useRef<HTMLInputElement>(null);
  const colMenuRef = useRef<HTMLDivElement>(null);

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

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const cats = useMemo(() => Array.from(new Set(variants.map(v => v.product.category.name))).sort(), [variants]);

  const totalIn  = variants.filter(v => v.inStock).length;
  const totalOut = variants.filter(v => !v.inStock).length;
  const tracked  = variants.filter(v => v.stockQty !== null).length;

  const filtered = useMemo(() => variants.filter(v => {
    const s = search.toLowerCase();
    const matchS = !s || v.product.name.toLowerCase().includes(s) || v.size.toLowerCase().includes(s) || v.product.category.name.toLowerCase().includes(s);
    const matchF =
      filterStatus === "all" ||
      (filterStatus === "in"      && v.inStock) ||
      (filterStatus === "out"     && !v.inStock) ||
      (filterStatus === "tracked" && v.stockQty !== null);
    const matchC = filterCat === "all" || v.product.category.name === filterCat;
    return matchS && matchF && matchC;
  }), [variants, search, filterStatus, filterCat]);

  /* ── patch helper ── */
  const patchVariant = useCallback(async (variantId: string, body: Record<string, unknown>, label?: string) => {
    setSaving(variantId);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, ...body }),
      });
      const data = await res.json();
      if (data.ok) {
        setVariants(vs => vs.map(v => v.id === variantId ? {
          ...v,
          inStock: data.inStock,
          stockQty: data.stockQty,
          pricePerCube: data.pricePerCube,
          pricePerPiece: data.pricePerPiece,
        } : v));
        if (label) showToast(`Сохранено: ${label}`, "ok");
      } else {
        showToast("Ошибка сохранения", "err");
      }
    } catch {
      showToast("Нет соединения с сервером", "err");
    } finally {
      setSaving(null);
    }
  }, []);

  /* ── inline edit ── */
  const startEdit = useCallback((id: string, field: EditField, currentVal: unknown) => {
    setEditing({ id, field });
    setEditVal(currentVal !== null && currentVal !== undefined ? String(currentVal) : "");
    setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const { id, field } = editing;
    setEditing(null);
    const raw = editVal.trim();

    if (field === "stockQty") {
      const stockQty = raw === "" ? null : parseInt(raw, 10);
      if (raw !== "" && isNaN(stockQty!)) return;
      const curVariant = variants.find(v => v.id === id)!;
      const newInStock = stockQty === null ? curVariant.inStock : stockQty > 0;
      setVariants(vs => vs.map(v => v.id === id ? { ...v, stockQty, inStock: newInStock } : v));
      await patchVariant(id, { stockQty }, `остаток ${stockQty ?? "—"}`);
    } else {
      const price = raw === "" ? null : parseFloat(raw.replace(/\s/g, "").replace(",", "."));
      if (raw !== "" && isNaN(price!)) return;
      setVariants(vs => vs.map(v => v.id === id ? { ...v, [field]: price } : v));
      const label = field === "pricePerCube" ? `цена м³ ${price ?? "—"}` : `цена шт ${price ?? "—"}`;
      await patchVariant(id, { [field]: price }, label);
    }
  }, [editing, editVal, variants, patchVariant]);

  /* ── status toggle ── */
  const toggleStatus = useCallback(async (v: Variant) => {
    const newInStock = !v.inStock;
    setVariants(vs => vs.map(x => x.id === v.id ? { ...x, inStock: newInStock } : x));
    await patchVariant(v.id, { inStock: newInStock }, newInStock ? "В наличии" : "Нет в наличии");
  }, [patchVariant]);

  /* shared props for EditCell */
  const editProps = { editing, editVal, saving, inputRef, onStartEdit: startEdit, onChangeVal: setEditVal, onSave: saveEdit, onCancel: cancelEdit };

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

      <div className="p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap no-print">
          <div>
            <h1 className="text-2xl font-display font-bold">Склад / Остатки</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {variants.length} вариантов · {totalIn} в наличии · {totalOut} нет · {tracked} отслеживается
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors">
              <Printer className="w-4 h-4" /> PDF / Печать
            </button>
            <Link href="/admin/import" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors">
              <FileDown className="w-4 h-4 text-primary" /> Импорт / Экспорт
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          {[
            { label: "Всего",         val: variants.length, color: "text-foreground",  key: "all" },
            { label: "В наличии",     val: totalIn,         color: "text-emerald-600", key: "in"  },
            { label: "Нет в наличии", val: totalOut,        color: "text-destructive", key: "out" },
            { label: "Отслеживается", val: tracked,         color: "text-primary",     key: "tracked" },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className={`p-3 rounded-xl border text-left transition-all ${filterStatus === s.key ? "border-primary/70 bg-card" : "border-border bg-card hover:bg-accent"}`}
              style={filterStatus === s.key ? { boxShadow: "inset 0 0 0 1.5px hsl(var(--primary)/0.35), 0 0 16px hsl(var(--primary)/0.12)" } : undefined}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 no-print">
          <div className="relative">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option value="all">Все категории</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Column visibility */}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setShowColMenu(p => !p)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors
                ${showColMenu ? "border-primary bg-primary/15 text-primary" : "border-border bg-card hover:bg-accent"}`}
            >
              <Settings2 className="w-4 h-4" /> Колонки
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-xl p-3 min-w-[180px] space-y-1">
                <p className="text-xs text-muted-foreground font-medium px-2 pb-1">Показать колонки</p>
                {ALL_COLS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => toggleCol(c.key)}
                    className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors text-left"
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${visibleCols.has(c.key) ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                      {visibleCols.has(c.key) && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl border border-border bg-card">
            <button onClick={() => setView("table")} className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-primary text-white" : "hover:bg-accent"}`}><LayoutList className="w-4 h-4" /></button>
            <button onClick={() => setView("cards")} className={`p-1.5 rounded-lg transition-colors ${view === "cards" ? "bg-primary text-white" : "hover:bg-accent"}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground no-print">
          Нажмите на любое значение (цену, остаток) для редактирования. Статус — переключается кликом.
        </p>

        {/* Content */}
        <div id="inventory-print">
          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-xl font-bold">ПилоРус — Отчёт по остаткам</h2>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })} · {filtered.length} позиций</p>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2 no-print">
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />Ничего не найдено
              </div>
            )}
            {filtered.map(v => (
              <div key={v.id} className={`bg-card border border-border rounded-2xl p-4 space-y-3 ${!v.inStock ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{v.product.name}</p>
                    <p className="text-xs text-muted-foreground">{v.product.category.name} · <span className="font-mono">{v.size}</span></p>
                  </div>
                  <StockBadge v={v} onToggle={() => toggleStatus(v)} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {col("pricePerCube") && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Цена м³</p>
                      <EditCell v={v} field="pricePerCube" display={fmt(v.pricePerCube)} placeholder="0" {...editProps} />
                    </div>
                  )}
                  {col("pricePerPiece") && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Цена шт</p>
                      <EditCell v={v} field="pricePerPiece" display={fmt(v.pricePerPiece)} placeholder="0" {...editProps} />
                    </div>
                  )}
                  {col("stockQty") && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Остаток</p>
                      <EditCell v={v} field="stockQty" display={v.stockQty !== null ? String(v.stockQty) : null} placeholder="шт" {...editProps} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Товар</th>
                    {col("category")      && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Категория</th>}
                    {col("size")          && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Размер</th>}
                    {col("pricePerCube")  && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Цена м³</th>}
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
                  {filtered.map(v => (
                    <tr key={v.id} className={`hover:bg-muted/20 transition-colors ${!v.inStock ? "opacity-60" : ""}`}>
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
                          <StockBadge v={v} onToggle={() => toggleStatus(v)} />
                        </td>
                      )}
                      <td className="px-4 py-3 no-print">
                        <Link href={`/admin/products/${v.product.id}?tab=variants`} className="text-xs text-primary hover:underline whitespace-nowrap">
                          →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print summary */}
          <div className="hidden print:block mt-6 text-xs text-gray-400 border-t pt-3">
            Всего: {variants.length} · В наличии: {totalIn} · Нет: {totalOut} · Отслеживается: {tracked}
          </div>
        </div>
      </div>
    </>
  );
}
