"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Package, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useSearchDrawer } from "@/store/search-drawer";

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  category: { name: string };
  images: string[];
  saleUnit: string;
  variants: { pricePerCube: number | null; pricePerPiece: number | null }[];
}

function SearchContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

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
          placeholder="Найти товар — доска, брус, вагонка..."
          aria-label="Поиск товаров"
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
        ) : query ? (
          <button
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Очистить"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Quick tags */}
      {query.length === 0 && (
        <div className="px-5 py-4 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Популярные запросы
          </p>
          <div className="flex flex-wrap gap-2">
            {["Доска обрезная", "Брус", "Вагонка", "Лиственница", "Планкен", "Блок-хаус", "Фанера", "Строганная"].map((hint) => (
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
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!loading && results.length === 0 && query.length >= 2 && (
          <div className="py-10 text-center text-sm text-muted-foreground px-5">
            <div className="text-4xl mb-3">🔍</div>
            По запросу «{query}» ничего не найдено
          </div>
        )}

        {results.map((r) => {
          const minPrice = r.variants.reduce((min, v) => {
            const p = v.pricePerCube ?? v.pricePerPiece;
            return p !== null && p < min ? p : min;
          }, Infinity);

          return (
            <Link
              key={r.id}
              href={`/product/${r.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent transition-colors border-b border-border/40 last:border-0"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                {r.images[0] ? (
                  <Image src={r.images[0]} alt={r.name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground opacity-50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.category.name}</p>
              </div>
              {minPrice !== Infinity && (
                <p className="text-sm font-semibold text-primary shrink-0">
                  {formatPrice(minPrice)}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer link */}
      {query.length >= 2 && results.length > 0 && (
        <div className="border-t border-border p-4 shrink-0">
          <Link
            href={`/catalog?search=${encodeURIComponent(query)}`}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            Смотреть все результаты →
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="relative w-[92vw] max-w-[400px] h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
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
