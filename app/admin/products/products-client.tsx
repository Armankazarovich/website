"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  Search, Pencil, X, Star, Eye, EyeOff,
  ArrowRight, Package, ChevronDown, Layers,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  active: boolean;
  featured: boolean;
  variants: { pricePerCube: unknown; pricePerPiece: unknown }[];
  category: { name: string };
};

type Category = { id: string; name: string };

export function ProductsClient({
  products: init,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [products, setProducts] = useState(init);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [drawer, setDrawer] = useState<Product | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  /* drawer state */
  const [dName, setDName] = useState("");
  const [dCat, setDCat] = useState("");
  const [dActive, setDActive] = useState(true);
  const [dFeatured, setDFeatured] = useState(false);

  /* ── helpers ── */
  const minPrice = (p: Product) => {
    const min = p.variants.reduce((m, v) => {
      const price = Number(v.pricePerCube ?? v.pricePerPiece ?? 0);
      return price > 0 && price < m ? price : m;
    }, Infinity);
    return min === Infinity ? null : min;
  };

  const patch = async (id: string, body: object) => {
    setSaving(id);
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } finally { setSaving(null); }
  };

  /* ── quick toggle active ── */
  const toggleActive = async (p: Product, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const val = !p.active;
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, active: val } : x));
    await patch(p.id, { active: val });
  };

  /* ── open drawer ── */
  const openDrawer = (p: Product, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDName(p.name); setDCat(p.categoryId);
    setDActive(p.active); setDFeatured(p.featured);
    setDrawer(p);
  };

  /* ── save drawer ── */
  const saveDrawer = async () => {
    if (!drawer) return;
    const cat = categories.find(c => c.id === dCat);
    setProducts(ps => ps.map(x => x.id === drawer.id
      ? { ...x, name: dName, categoryId: dCat, active: dActive, featured: dFeatured, category: cat ? { name: cat.name } : x.category }
      : x
    ));
    setDrawer(null);
    await patch(drawer.id, { name: dName, categoryId: dCat, active: dActive, featured: dFeatured });
  };

  /* ── filtered list ── */
  const filtered = useMemo(() => products.filter(p => {
    const matchCat = catFilter === "ALL" || p.categoryId === catFilter;
    const matchS = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchS;
  }), [products, search, catFilter]);

  /* ── status badge ── */
  const StatusBadge = ({ p }: { p: Product }) => (
    <button
      onClick={(e) => toggleActive(p, e)}
      disabled={saving === p.id}
      title="Нажмите для переключения"
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95
        ${saving === p.id ? "opacity-50 cursor-wait" : "cursor-pointer hover:opacity-80"}
        ${p.active
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
          : "bg-muted text-muted-foreground border-border"
        }`}
    >
      {p.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {p.active ? "Активен" : "Скрыт"}
    </button>
  );

  return (
    <>
      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="relative">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="appearance-none py-2 pl-3 pr-8 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">Все категории</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} из {products.length}</span>
      </div>

      {/* ── MOBILE: cards ── */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {products.length === 0 ? (
              <Link href="/admin/products/new" className="text-primary hover:underline">Добавить первый товар</Link>
            ) : "Ничего не найдено"}
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} className={`bg-card border border-border rounded-2xl p-4 transition-all ${!p.active ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.category.name}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {p.featured && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                <button
                  onClick={(e) => openDrawer(p, e)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{p.variants.length} вар.</span>
                {minPrice(p) !== null && <span className="font-medium text-foreground">{formatPrice(minPrice(p)!)}</span>}
              </div>
              <StatusBadge p={p} />
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="hidden sm:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Товар</th>
                <th className="text-left px-4 py-3 font-semibold">Категория</th>
                <th className="text-center px-4 py-3 font-semibold">Вариантов</th>
                <th className="text-right px-4 py-3 font-semibold">Цена от</th>
                <th className="text-center px-4 py-3 font-semibold">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    {products.length === 0 ? (
                      <Link href="/admin/products/new" className="text-primary hover:underline">Добавить первый товар</Link>
                    ) : "Ничего не найдено"}
                  </td>
                </tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${!p.active ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.featured && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category.name}</td>
                  <td className="px-4 py-3 text-center">{p.variants.length}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {minPrice(p) !== null ? formatPrice(minPrice(p)!) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge p={p} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => openDrawer(p, e)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                      title="Быстрое редактирование"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── QUICK-EDIT DRAWER ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* backdrop */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawer(null)}
          />
          {/* panel */}
          <div className="w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold">Быстрое редактирование</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{drawer.name}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Название</label>
                <input
                  value={dName}
                  onChange={e => setDName(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Категория</label>
                <div className="relative mt-1.5">
                  <select
                    value={dCat}
                    onChange={e => setDCat(e.target.value)}
                    className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Toggles */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Настройки</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDActive(v => !v)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${dActive
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                        : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    {dActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {dActive ? "Активен" : "Скрыт"}
                  </button>
                  <button
                    onClick={() => setDFeatured(v => !v)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${dFeatured
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700"
                        : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    <Star className={`w-4 h-4 ${dFeatured ? "fill-amber-500 text-amber-500" : ""}`} />
                    {dFeatured ? "Топ товар" : "Обычный"}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p>Вариантов: <span className="font-medium text-foreground">{drawer.variants.length}</span></p>
                <p>Slug: <span className="font-mono text-foreground">{drawer.slug}</span></p>
              </div>
            </div>

            {/* footer */}
            <div className="px-5 py-4 border-t border-border space-y-2">
              <button
                onClick={saveDrawer}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
              >
                Сохранить
              </button>
              <Link
                href={`/admin/products/${drawer.id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                onClick={() => setDrawer(null)}
              >
                Полное редактирование
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
