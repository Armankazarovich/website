"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  Pencil, X, Star, Eye, EyeOff,
  ArrowRight, Package, ChevronDown, Layers,
  CheckSquare, Square, Trash2, Tag, TrendingUp, TrendingDown, Check,
  ImageOff, Stamp, AlertTriangle, Sparkles, Loader2,
} from "lucide-react";
import { checkProductReadiness, readinessIssueLabel, type ProductReadinessIssue } from "@/lib/product-seo";

type Product = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  active: boolean;
  featured: boolean;
  images: string[];
  description?: string | null;
  variants: {
    pricePerCube: number | string | null;
    pricePerPiece: number | string | null;
    inStock?: boolean;
  }[];
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState(init);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");

  // Фильтры из URL — синхронизируются со Smart Command Bar
  const urlActive = searchParams.get("active");     // "1" | "0" | null
  const urlNophoto = searchParams.get("nophoto");   // "1" | null
  const urlFeatured = searchParams.get("featured"); // "1" | null
  const urlHidden = searchParams.get("hidden");     // "1" | null — скрыто от публики

  // Локальный toggle "Без фото" (по кнопке или из URL)
  const noPhotoOnly = urlNophoto === "1";
  const hiddenOnly = urlHidden === "1";
  const [drawer, setDrawer] = useState<Product | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  /* bulk selection */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkCat, setBulkCat] = useState("");
  const [pricePercent, setPricePercent] = useState("");
  const [priceChanged, setPriceChanged] = useState(false);
  const [wmSaving, setWmSaving] = useState(false);

  /* drawer state */
  const [dName, setDName] = useState("");
  const [dCat, setDCat] = useState("");
  const [dActive, setDActive] = useState(true);
  const [dFeatured, setDFeatured] = useState(false);
  const [dDesc, setDDesc] = useState("");
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);

  // PageActions подключён через ProductsActions wrapper в page.tsx,
  // напрямую из products-client вызов useAdminPageActions ломал hydration
  // (React #423) из-за гигантского размера client-bundle этого компонента.

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

  /* filtered + sorted */
  const filtered = useMemo(() => {
    const list = products.filter(p => {
      const matchCat = catFilter === "ALL" || p.categoryId === catFilter;
      const matchS = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchActive = urlActive === null || (urlActive === "1" ? p.active : !p.active);
      const matchNophoto = !noPhotoOnly || p.images.length === 0;
      const matchFeatured = !urlFeatured || p.featured;
      const matchHidden = !hiddenOnly || !checkProductReadiness(p).ready;
      return matchCat && matchS && matchActive && matchNophoto && matchFeatured && matchHidden;
    });
    return list.sort((a, b) => {
      if (sortBy === "name_az") return a.name.localeCompare(b.name, "ru");
      if (sortBy === "name_za") return b.name.localeCompare(a.name, "ru");
      if (sortBy === "active") return Number(b.active) - Number(a.active);
      if (sortBy === "hidden") return Number(a.active) - Number(b.active);
      if (sortBy === "price_asc") return (minPrice(a) ?? 0) - (minPrice(b) ?? 0);
      if (sortBy === "price_desc") return (minPrice(b) ?? 0) - (minPrice(a) ?? 0);
      return 0; // newest — сервер уже вернул в нужном порядке
    });
  }, [products, search, catFilter, noPhotoOnly, hiddenOnly, urlActive, urlFeatured, sortBy]);

  /* счётчик скрытых от публики товаров (для бейджа) */
  const hiddenFromPublicCount = useMemo(
    () => products.filter((p) => !checkProductReadiness(p).ready).length,
    [products]
  );

  /* ── selection helpers ── */
  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const someSelected = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  /* ── bulk actions ── */
  const bulkSetActive = async (active: boolean) => {
    const ids = Array.from(selected);
    setProducts(ps => ps.map(p => selected.has(p.id) ? { ...p, active } : p));
    setSelected(new Set());
    setBulkSaving(true);
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
        })
      ));
    } finally { setBulkSaving(false); }
  };

  const bulkChangePrice = async () => {
    const pct = parseFloat(pricePercent);
    if (isNaN(pct) || pct === 0) return;
    const ids = Array.from(selected);
    setBulkSaving(true);
    try {
      const res = await fetch("/api/admin/products/bulk-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids, percent: pct }),
      });
      if (res.ok) {
        setPriceChanged(true);
        setPricePercent("");
        setTimeout(() => setPriceChanged(false), 2000);
      }
    } finally { setBulkSaving(false); }
  };

  const bulkSetCategory = async (categoryId: string) => {
    if (!categoryId) return;
    const cat = categories.find(c => c.id === categoryId);
    const ids = Array.from(selected);
    setProducts(ps => ps.map(p => selected.has(p.id)
      ? { ...p, categoryId, category: cat ? { name: cat.name } : p.category }
      : p
    ));
    setSelected(new Set());
    setBulkSaving(true);
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        })
      ));
    } finally { setBulkSaving(false); }
  };

  const bulkWatermark = async () => {
    const ids = Array.from(selected);
    const withImages = products.filter(p => ids.includes(p.id) && p.images[0]);
    if (!withImages.length) return;
    setWmSaving(true);
    try {
      await Promise.all(withImages.map(p =>
        fetch("/api/admin/watermark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: p.id, imageUrl: p.images[0] }),
        })
      ));
    } finally { setWmSaving(false); }
  };

  /* ── quick toggle active ── */
  const toggleActive = async (p: Product, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const val = !p.active;
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, active: val } : x));
    await patch(p.id, { active: val });
  };

  /* ── клик по карандашу: сразу на страницу редактирования ── */
  const openDrawer = (p: Product, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    router.push(`/admin/products/${p.id}`);
  };

  const saveDrawer = async () => {
    if (!drawer) return;
    const cat = categories.find(c => c.id === dCat);
    setProducts(ps => ps.map(x => x.id === drawer.id
      ? {
          ...x,
          name: dName,
          categoryId: dCat,
          active: dActive,
          featured: dFeatured,
          description: dDesc,
          category: cat ? { name: cat.name } : x.category,
        }
      : x
    ));
    setDrawer(null);
    await patch(drawer.id, {
      name: dName,
      categoryId: dCat,
      active: dActive,
      featured: dFeatured,
      description: dDesc,
    });
  };

  /* ── ARAY: улучшить описание ── */
  const improveDescription = async () => {
    if (!drawer) return;
    setImproving(true);
    setImproveError(null);
    try {
      const res = await fetch(`/api/admin/products/${drawer.id}/improve-seo`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Не удалось получить ответ от ARAY");
      }
      if (data?.description) {
        setDDesc(data.description);
      }
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : "Ошибка связи с ARAY");
    } finally {
      setImproving(false);
    }
  };

  /* ── status badge ── */
  const StatusBadge = ({ p }: { p: Product }) => (
    <button
      onClick={(e) => toggleActive(p, e)}
      disabled={saving === p.id}
      title="Нажмите для переключения"
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95
        ${saving === p.id ? "opacity-50 cursor-wait" : "cursor-pointer hover:opacity-80"}
        ${p.active
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-muted text-muted-foreground border-border"}`}
    >
      {p.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {p.active ? "Активен" : "Скрыт"}
    </button>
  );

  /* ── Readiness индикатор публикации ── */
  const ReadinessBadge = ({ p, compact = false }: { p: Product; compact?: boolean }) => {
    const r = checkProductReadiness(p);
    if (r.ready && r.warnings.length === 0) {
      // Всё ок
      if (compact) {
        return (
          <span
            title="Показывается клиентам"
            className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            aria-label="Публикация: всё хорошо"
          />
        );
      }
      return (
        <span
          title="Показывается клиентам"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          На витрине
        </span>
      );
    }

    const allIssues: ProductReadinessIssue[] = [...r.blockers, ...r.warnings];
    const titleText = r.ready
      ? `Показывается, но есть замечания:\n• ${r.warnings.map(readinessIssueLabel).join("\n• ")}`
      : `СКРЫТО от клиентов.\nПричины:\n• ${r.blockers.map(readinessIssueLabel).join("\n• ")}${r.warnings.length ? "\nТакже:\n• " + r.warnings.map(readinessIssueLabel).join("\n• ") : ""}`;

    if (compact) {
      return (
        <span
          title={titleText}
          className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${
            r.ready
              ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
              : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]"
          }`}
          aria-label={r.ready ? "Публикация: есть замечания" : "Публикация: скрыто от клиентов"}
        />
      );
    }

    return (
      <span
        title={titleText}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
          r.ready
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
            : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
        }`}
      >
        <AlertTriangle className="w-3 h-3 shrink-0" />
        {r.ready ? "Замечания" : "Скрыто"}
        {allIssues.length > 1 && (
          <span className="ml-0.5 text-[10px] opacity-70">({allIssues.length})</span>
        )}
      </span>
    );
  };

  return (
    <>
      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (noPhotoOnly) { params.delete("nophoto"); } else { params.set("nophoto", "1"); }
            router.push(`${pathname}?${params.toString()}`);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all ${noPhotoOnly ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" : "border-border text-muted-foreground hover:bg-primary/[0.05]"}`}
        >
          <ImageOff className="w-4 h-4" />
          Без фото {noPhotoOnly && `(${products.filter(p => p.images.length === 0).length})`}
        </button>
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (hiddenOnly) { params.delete("hidden"); } else { params.set("hidden", "1"); }
            router.push(`${pathname}?${params.toString()}`);
          }}
          title="Товары, которые не показываются клиентам (нет фото, цены или всё не в наличии)"
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all ${hiddenOnly ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" : "border-border text-muted-foreground hover:bg-primary/[0.05]"}`}
        >
          <AlertTriangle className="w-4 h-4" />
          Скрытые от клиентов {hiddenFromPublicCount > 0 && `(${hiddenFromPublicCount})`}
        </button>
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="appearance-none py-2 pl-3 pr-8 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="newest">Сначала новые</option>
            <option value="name_az">Название А→Я</option>
            <option value="name_za">Название Я→А</option>
            <option value="active">Активные первые</option>
            <option value="hidden">Скрытые первые</option>
            <option value="price_asc">Цена ↑</option>
            <option value="price_desc">Цена ↓</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} из {products.length}</span>
      </div>

      {/* ── BULK ACTION BAR ── */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-primary/15 border border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-semibold text-primary">
            {selected.size} выбрано
          </span>
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={() => bulkSetActive(true)}
              disabled={bulkSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" /> Сделать активными
            </button>
            <button
              onClick={() => bulkSetActive(false)}
              disabled={bulkSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground border border-border text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              <EyeOff className="w-3.5 h-3.5" /> Скрыть
            </button>
            <button
              onClick={bulkWatermark}
              disabled={wmSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Stamp className="w-3.5 h-3.5" /> {wmSaving ? "Наносим..." : "Водяной знак"}
            </button>
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={bulkCat}
                onChange={e => { setBulkCat(e.target.value); if (e.target.value) bulkSetCategory(e.target.value); }}
                disabled={bulkSaving}
                className="text-xs py-1.5 pl-2 pr-6 rounded-xl border border-border bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">Переместить в категорию…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Bulk price change */}
            <div className="flex items-center gap-1">
              {priceChanged ? (
                <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-xl">
                  <Check className="w-3.5 h-3.5" /> Цены обновлены
                </span>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="number"
                      value={pricePercent}
                      onChange={e => setPricePercent(e.target.value)}
                      placeholder="±%"
                      disabled={bulkSaving}
                      className="w-20 text-xs py-1.5 pl-2 pr-1 rounded-l-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={bulkChangePrice}
                    disabled={bulkSaving || !pricePercent}
                    title="Изменить цены на % для выбранных"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-r-xl border border-l-0 border-border bg-background text-xs font-medium hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    {parseFloat(pricePercent) < 0
                      ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      : <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                    Цены
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MOBILE/TABLET: cards ── */}
      <div className="lg:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {products.length === 0
              ? <Link href="/admin/products/new" className="text-primary hover:underline">Добавить первый товар</Link>
              : "Ничего не найдено"}
          </div>
        )}
        {filtered.map(p => (
          <div
            key={p.id}
            className={`bg-card border rounded-2xl p-4 transition-all ${!p.active ? "opacity-60" : ""} ${selected.has(p.id) ? "border-primary bg-primary/15" : "border-border"}`}
          >
            <div className="flex items-start gap-3">
              <button onClick={() => toggleSelect(p.id)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              </button>
              <Link href={`/admin/products/${p.id}`} className="w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-5 h-5 text-muted-foreground/30" />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.category.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.featured && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                    <button onClick={(e) => openDrawer(p, e)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{p.variants.length}</span>
                    {minPrice(p) !== null && <span className="font-medium text-foreground">{formatPrice(minPrice(p)!)}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ReadinessBadge p={p} />
                    <StatusBadge p={p} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="hidden lg:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-primary transition-colors">
                    {allSelected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : someSelected
                        ? <CheckSquare className="w-4 h-4 text-primary/50" />
                        : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-3 w-14">Фото</th>
                <th className="text-left px-4 py-3 font-semibold">Товар</th>
                <th className="text-left px-4 py-3 font-semibold">Категория</th>
                <th className="text-center px-4 py-3 font-semibold">Вариантов</th>
                <th className="text-right px-4 py-3 font-semibold">Цена от</th>
                <th className="text-center px-4 py-3 font-semibold">Статус</th>
                <th className="text-center px-4 py-3 font-semibold">Публикация</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    {products.length === 0
                      ? <Link href="/admin/products/new" className="text-primary hover:underline">Добавить первый товар</Link>
                      : "Ничего не найдено"}
                  </td>
                </tr>
              )}
              {filtered.map(p => (
                <tr
                  key={p.id}
                  className={`hover:bg-primary/[0.05] transition-colors ${!p.active ? "opacity-60" : ""} ${selected.has(p.id) ? "bg-primary/15" : ""}`}
                >
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(p.id)} className="text-muted-foreground hover:text-primary transition-colors">
                      {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/products/${p.id}`} className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0 hover:ring-2 hover:ring-primary/40 transition-all">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                      )}
                    </Link>
                  </td>
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
                  <td className="px-4 py-3 text-center"><ReadinessBadge p={p} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => openDrawer(p, e)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                      title="Редактировать товар"
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
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(null)} />
          <div className="w-full max-w-sm bg-card border-l border-border shadow-lg flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold">Быстрое редактирование</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{drawer.name}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Название</label>
                <input
                  value={dName}
                  onChange={e => setDName(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
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
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Настройки</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDActive(v => !v)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${dActive ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700" : "border-border text-muted-foreground hover:bg-accent"}`}
                  >
                    {dActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {dActive ? "Активен" : "Скрыт"}
                  </button>
                  <button
                    onClick={() => setDFeatured(v => !v)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${dFeatured ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700" : "border-border text-muted-foreground hover:bg-accent"}`}
                  >
                    <Star className={`w-4 h-4 ${dFeatured ? "fill-amber-500 text-amber-500" : ""}`} />
                    {dFeatured ? "Топ товар" : "Обычный"}
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Описание
                  </label>
                  <button
                    type="button"
                    onClick={improveDescription}
                    disabled={improving}
                    title="ARAY перепишет описание под SEO и живой язык"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    {improving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {improving ? "ARAY думает…" : "Улучшить"}
                  </button>
                </div>
                <textarea
                  value={dDesc}
                  onChange={(e) => setDDesc(e.target.value)}
                  rows={5}
                  placeholder="Пусто — будет авто-описание из полей товара"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[120px]"
                />
                {improveError && (
                  <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                    {improveError}
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Если оставить пустым — при сохранении сгенерируется шаблонное описание (город, размеры, цена, доставка).
                </p>
              </div>

              {/* Публикация — статус видимости клиентам */}
              {(() => {
                const r = checkProductReadiness({
                  ...drawer,
                  description: dDesc,
                  active: dActive,
                });
                if (r.ready && r.warnings.length === 0) return null;
                return (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      r.ready
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {r.ready ? "Замечания" : "Товар скрыт от клиентов"}
                    </p>
                    <ul className="pl-5 list-disc space-y-0.5">
                      {[...r.blockers, ...r.warnings].map((i) => (
                        <li key={i}>{readinessIssueLabel(i)}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p>Вариантов: <span className="font-medium text-foreground">{drawer.variants.length}</span></p>
                <p>Slug: <span className="font-mono text-foreground">{drawer.slug}</span></p>
              </div>
            </div>
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
                Полное редактирование <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
