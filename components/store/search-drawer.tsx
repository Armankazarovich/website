"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Package, Loader2, ChevronRight, Tag, LayoutGrid } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useSearchDrawer } from "@/store/search-drawer";

interface Variant { pricePerCube: number | null; pricePerPiece: number | null; size?: string; }
interface Product {
  id: string; slug: string; name: string; images: string[];
  saleUnit: string; category: { name: string; slug: string };
  inStock?: boolean; variants: Variant[];
}
interface Category { id: string; name: string; slug: string; count?: number; }
interface SearchData {
  results: Product[];
  grouped: { categoryName: string; categorySlug: string; products: Product[] }[];
  total: number;
  categories: Category[];
  sizes: string[];
  popularCategories: Category[];
  featuredProducts: Product[];
}

function minPrice(variants: Variant[]) {
  return variants.reduce((min, v) => {
    const p = v.pricePerCube ?? v.pricePerPiece;
    return p !== null && p < min ? p : min;
  }, Infinity);
}

function ProductRow({ p, onClose }: { p: Product; onClose: () => void }) {
  const price = minPrice(p.variants);
  return (
    <Link
      href={`/product/${p.slug}`}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60 transition-colors rounded-xl group"
    >
      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-muted shrink-0">
        {p.images[0] ? (
          <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="44px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{p.name}</p>
        <p className="text-[11px] text-muted-foreground">{p.category.name}</p>
      </div>
      <div className="text-right shrink-0">
        {price !== Infinity && (
          <p className="text-sm font-bold text-primary">от {formatPrice(price)}</p>
        )}
        {p.inStock !== undefined && (
          <p className={`text-[10px] ${p.inStock ? "text-emerald-500" : "text-muted-foreground"}`}>
            {p.inStock ? "В наличии" : "Нет"}
          </p>
        )}
      </div>
    </Link>
  );
}

function SearchContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showGrouped, setShowGrouped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Load popular data on mount
  useEffect(() => {
    fetch("/api/search?q=").then(r => r.json()).then(setData).catch(() => {});
  }, []);

  const doSearch = useCallback((q: string, cat?: string | null, size?: string | null) => {
    if (q.length < 2) return;
    setLoading(true);
    const params = new URLSearchParams({ q });
    if (cat) params.set("category", cat);
    fetch(`/api/search?${params}`)
      .then(r => r.json())
      .then(d => {
        if (size) {
          d.results = d.results.filter((p: Product) => p.variants.some(v => v.size === size));
          d.grouped = d.grouped.map((g: any) => ({
            ...g,
            products: g.products.filter((p: Product) => p.variants.some(v => v.size === size)),
          })).filter((g: any) => g.products.length > 0);
        }
        setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setActiveSize(null);
      setActiveCategory(null);
      return;
    }
    const t = setTimeout(() => doSearch(query, activeCategory, activeSize), 280);
    return () => clearTimeout(t);
  }, [query, activeCategory, activeSize, doSearch]);

  const hasResults = data && data.results.length > 0;
  const isEmpty = query.length === 0;

  const catalogHref = () => {
    const p = new URLSearchParams();
    if (query) p.set("search", query);
    if (activeCategory) p.set("category", activeCategory);
    if (activeSize) p.set("size", activeSize);
    return `/catalog?${p.toString()}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Доска, брус, вагонка, 50×150..."
          aria-label="Поиск товаров"
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
        ) : query ? (
          <button onClick={() => { setQuery(""); setActiveSize(null); setActiveCategory(null); }}
            className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Очистить">
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Active filter chips */}
      {(activeSize || activeCategory) && (
        <div className="flex gap-2 px-4 py-2 border-b border-border shrink-0 flex-wrap">
          {activeCategory && data?.categories?.find(c => c.slug === activeCategory) && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              <LayoutGrid className="w-3 h-3" />
              {data.categories.find(c => c.slug === activeCategory)?.name}
              <button onClick={() => setActiveCategory(null)} className="ml-0.5 hover:text-primary/70">✕</button>
            </span>
          )}
          {activeSize && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              <Tag className="w-3 h-3" />
              {activeSize}
              <button onClick={() => setActiveSize(null)} className="ml-0.5 hover:text-primary/70">✕</button>
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Empty state — popular */}
        {isEmpty && data && (
          <div className="p-4 space-y-5">
            {data.popularCategories?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">
                  Категории
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {data.popularCategories.map(cat => (
                    <Link
                      key={cat.id}
                      href={`/catalog?category=${cat.slug}`}
                      onClick={onClose}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all group"
                    >
                      <span className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{cat.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.featuredProducts?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">
                  Популярные товары
                </p>
                <div className="space-y-1">
                  {data.featuredProducts.map(p => <ProductRow key={p.id} p={p} onClose={onClose} />)}
                </div>
              </div>
            )}

            {/* Quick tags */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">
                Быстрый поиск
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Доска обрезная", "Брус", "Вагонка", "Лиственница", "Планкен", "Блок-хаус", "50×150", "100×100"].map(hint => (
                  <button
                    key={hint}
                    onClick={() => setQuery(hint)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent hover:border-primary/30 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search results */}
        {!isEmpty && query.length >= 2 && (
          <div className="p-3 space-y-4">
            {/* Category filter chips */}
            {data?.categories && data.categories.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">По категории</p>
                <div className="flex gap-1.5 flex-wrap">
                  {data.categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(activeCategory === cat.slug ? null : cat.slug)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
                        activeCategory === cat.slug
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                      {cat.count ? <span className="ml-1 opacity-60">{cat.count}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size filter chips */}
            {data?.sizes && data.sizes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">По размеру</p>
                <div className="flex gap-1.5 flex-wrap">
                  {data.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setActiveSize(activeSize === size ? null : size)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium font-mono ${
                        activeSize === size
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {!loading && !hasResults && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <div className="text-4xl mb-3">🔍</div>
                <p>По запросу «{query}» ничего не найдено</p>
                <Link
                  href={`/catalog?search=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="mt-3 inline-block text-xs text-primary hover:underline"
                >
                  Посмотреть весь каталог →
                </Link>
              </div>
            )}

            {/* View toggle */}
            {hasResults && data.grouped && data.grouped.length > 1 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-muted-foreground">Найдено: {data.total}</p>
                <button
                  onClick={() => setShowGrouped(!showGrouped)}
                  className="text-xs text-primary hover:underline"
                >
                  {showGrouped ? "Списком" : "По группам"}
                </button>
              </div>
            )}

            {/* Grouped results */}
            {hasResults && showGrouped && data.grouped ? (
              <div className="space-y-4">
                {data.grouped.map(group => (
                  <div key={group.categorySlug}>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.categoryName}
                      </p>
                      <Link
                        href={`/catalog?category=${group.categorySlug}&search=${encodeURIComponent(query)}`}
                        onClick={onClose}
                        className="text-xs text-primary hover:underline"
                      >
                        Все →
                      </Link>
                    </div>
                    <div className="space-y-0.5">
                      {group.products.map(p => <ProductRow key={p.id} p={p} onClose={onClose} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : hasResults ? (
              <div className="space-y-0.5">
                {data.results.map(p => <ProductRow key={p.id} p={p} onClose={onClose} />)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isEmpty && query.length >= 2 && hasResults && (
        <div className="border-t border-border p-4 shrink-0">
          <Link
            href={catalogHref()}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
          >
            Смотреть все {data.total > 0 ? `${data.total} ` : ""}результатов →
          </Link>
        </div>
      )}
    </div>
  );
}

export function SearchDrawer() {
  const { open, setOpen } = useSearchDrawer();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="relative w-full sm:w-[92vw] sm:max-w-[420px] h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <p className="font-display font-semibold text-lg">Поиск</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                aria-label="Закрыть поиск"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <SearchContent onClose={() => setOpen(false)} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
