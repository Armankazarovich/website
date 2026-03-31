"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Package, Search, CheckCircle2, XCircle, FileDown,
  Printer, ChevronDown, Pencil, Minus, LayoutList, LayoutGrid,
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

/* ─── helper ─────────────────────────────────────────── */
function fmt(n: unknown) {
  if (!n) return null;
  return Number(n).toLocaleString("ru-RU") + " ₽";
}

function StockBadge({ v }: { v: Variant }) {
  if (v.stockQty === null) {
    return v.inStock ? (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" /> В наличии
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
        <XCircle className="w-3.5 h-3.5" /> Нет
      </span>
    );
  }
  if (v.stockQty === 0)
    return <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium"><XCircle className="w-3.5 h-3.5" /> Нет (0)</span>;
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> {v.stockQty} шт.
    </span>
  );
}

/* ─── main component ─────────────────────────────────── */
export function InventoryClient({ variants: init }: { variants: Variant[] }) {
  const [variants, setVariants] = useState(init);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "in" | "out" | "tracked">("all");
  const [filterCat, setFilterCat] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");
  const inputRef = useRef<HTMLInputElement>(null);

  /* categories list */
  const cats = useMemo(() => Array.from(new Set(variants.map(v => v.product.category.name))).sort(), [variants]);

  /* stats */
  const totalIn = variants.filter(v => v.inStock).length;
  const totalOut = variants.filter(v => !v.inStock).length;
  const tracked = variants.filter(v => v.stockQty !== null).length;

  /* filtered */
  const filtered = useMemo(() => variants.filter(v => {
    const s = search.toLowerCase();
    const matchS = !s || v.product.name.toLowerCase().includes(s) || v.size.toLowerCase().includes(s) || v.product.category.name.toLowerCase().includes(s);
    const matchF =
      filterStatus === "all" ||
      (filterStatus === "in" && v.inStock) ||
      (filterStatus === "out" && !v.inStock) ||
      (filterStatus === "tracked" && v.stockQty !== null);
    const matchC = filterCat === "all" || v.product.category.name === filterCat;
    return matchS && matchF && matchC;
  }), [variants, search, filterStatus, filterCat]);

  /* ── inline edit ── */
  const startEdit = (v: Variant) => {
    setEditingId(v.id);
    setEditVal(v.stockQty !== null ? String(v.stockQty) : "");
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const saveEdit = async (variantId: string) => {
    setEditingId(null);
    const raw = editVal.trim();
    const stockQty = raw === "" ? null : parseInt(raw, 10);
    if (raw !== "" && isNaN(stockQty!)) return;

    // optimistic
    const prev = variants.find(v => v.id === variantId)!;
    const newInStock = stockQty === null ? prev.inStock : stockQty > 0;
    setVariants(vs => vs.map(v => v.id === variantId ? { ...v, stockQty, inStock: newInStock } : v));

    setSaving(variantId);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, stockQty }),
      });
      const data = await res.json();
      if (data.ok) {
        setVariants(vs => vs.map(v => v.id === variantId ? { ...v, stockQty: data.stockQty, inStock: data.inStock } : v));
      }
    } catch { /* keep optimistic */ }
    finally { setSaving(null); }
  };

  /* ── qty cell ── */
  const QtyCell = ({ v }: { v: Variant }) => {
    if (saving === v.id) return <span className="text-muted-foreground text-xs animate-pulse">…</span>;
    if (editingId === v.id) return (
      <input
        ref={inputRef}
        type="number" min={0}
        value={editVal}
        onChange={e => setEditVal(e.target.value)}
        onBlur={() => saveEdit(v.id)}
        onKeyDown={e => { if (e.key === "Enter") saveEdit(v.id); if (e.key === "Escape") setEditingId(null); }}
        className="w-16 px-2 py-1 text-sm text-center border-2 border-primary rounded-lg focus:outline-none bg-background"
      />
    );
    return (
      <button
        onClick={() => startEdit(v)}
        title="Нажмите для изменения"
        className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-sm font-medium
          hover:border-primary/60 hover:bg-primary/5
          ${v.stockQty === null
            ? "border-dashed border-border text-muted-foreground"
            : v.stockQty === 0
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700"
          }`}
      >
        {v.stockQty === null ? <Minus className="w-3 h-3" /> : v.stockQty}
        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
      </button>
    );
  };

  /* ── PDF print ── */
  const handlePrint = () => window.print();

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #inventory-print, #inventory-print * { visibility: visible !important; }
          #inventory-print { position: absolute; inset: 0; padding: 20px; }
          .no-print { display: none !important; }
          table { font-size: 11px; }
          th, td { padding: 4px 8px !important; }
        }
      `}</style>

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
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
            >
              <Printer className="w-4 h-4" /> PDF / Печать
            </button>
            <Link
              href="/admin/import"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
            >
              <FileDown className="w-4 h-4 text-primary" /> Импорт / Экспорт
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          {[
            { label: "Всего", val: variants.length, color: "text-foreground", key: "all" },
            { label: "В наличии", val: totalIn, color: "text-emerald-600", key: "in" },
            { label: "Нет в наличии", val: totalOut, color: "text-destructive", key: "out" },
            { label: "Отслеживается", val: tracked, color: "text-primary", key: "tracked" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key as typeof filterStatus)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterStatus === s.key
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:bg-accent"
              }`}
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 no-print">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по товару, размеру, категории..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="all">Все категории</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {/* view toggle — desktop only */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl border border-border bg-card">
            <button onClick={() => setView("table")} className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-primary text-white" : "hover:bg-accent"}`}>
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setView("cards")} className={`p-1.5 rounded-lg transition-colors ${view === "cards" ? "bg-primary text-white" : "hover:bg-accent"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground no-print">
          💡 Нажмите на значение в колонке <strong>Остаток</strong> для изменения. 0 = нет в наличии, число = кол-во, прочерк = не отслеживается.
        </p>

        {/* ── TABLE view ── */}
        <div id="inventory-print">
          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-xl font-bold">ПилоРус — Отчёт по остаткам</h2>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })} · {filtered.length} позиций</p>
          </div>

          {view === "table" || true ? (
            <div className={`bg-card border border-border rounded-2xl overflow-hidden ${view === "cards" ? "sm:hidden" : ""}`}>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Ничего не найдено
                  </div>
                )}
                {filtered.map(v => (
                  <div key={v.id} className={`p-4 space-y-2 ${!v.inStock ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{v.product.name}</p>
                        <p className="text-xs text-muted-foreground">{v.product.category.name} · <span className="font-mono">{v.size}</span></p>
                      </div>
                      <StockBadge v={v} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-3 text-sm">
                        {fmt(v.pricePerCube) && <span className="text-muted-foreground">{fmt(v.pricePerCube)} /м³</span>}
                        {fmt(v.pricePerPiece) && <span className="text-muted-foreground">{fmt(v.pricePerPiece)} /шт</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Остаток:</span>
                          <QtyCell v={v} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Товар</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Категория</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Размер</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Цена м³</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Цена шт</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Остаток</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Статус</th>
                      <th className="px-4 py-3 no-print" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Ничего не найдено
                        </td>
                      </tr>
                    )}
                    {filtered.map(v => (
                      <tr key={v.id} className={`hover:bg-muted/20 transition-colors ${!v.inStock ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">
                          <Link href={`/admin/products/${v.product.id}`} className="font-medium hover:text-primary transition-colors line-clamp-1">
                            {v.product.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{v.product.category.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{v.size}</td>
                        <td className="px-4 py-3 text-right">{fmt(v.pricePerCube) ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-right">{fmt(v.pricePerPiece) ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center"><QtyCell v={v} /></div>
                        </td>
                        <td className="px-4 py-3 text-center"><StockBadge v={v} /></td>
                        <td className="px-4 py-3 no-print">
                          <Link href={`/admin/products/${v.product.id}?tab=variants`} className="text-xs text-primary hover:underline whitespace-nowrap">
                            Изменить →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Summary for print */}
        <div className="hidden print:block mt-6 text-xs text-gray-400 border-t pt-3">
          Всего: {variants.length} · В наличии: {totalIn} · Нет: {totalOut} · Отслеживается: {tracked}
        </div>
      </div>
    </>
  );
}
