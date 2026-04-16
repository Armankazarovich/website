"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Package, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  category: { name: string };
  images: string[];
  saleUnit: string;
  variants: { pricePerCube: number | null; pricePerPiece: number | null }[];
}

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
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
      setError(false);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
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
          ) : (
            <button
              onClick={onClose}
              aria-label="Закрыть поиск"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!loading && error && query.length >= 2 && (
            <div className="py-10 text-center text-sm text-destructive">
              <p>Не удалось выполнить поиск</p>
              <button
                onClick={() => setQuery((q) => q + " ")}
                className="mt-2 text-primary hover:underline text-xs"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {!loading && !error && results.length === 0 && query.length >= 2 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              По запросу «{query}» ничего не найдено
            </div>
          )}

          {!loading && query.length === 0 && (
            <div className="py-6 px-4 text-center">
              <p className="text-sm text-muted-foreground">Введите название товара для поиска</p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {["Доска обрезная", "Брус 150×150", "Вагонка", "Планкен"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setQuery(hint)}
                    className="text-xs px-3 py-1 rounded-full bg-accent text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
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
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {r.images[0] ? (
                    <Image
                      src={r.images[0]}
                      alt={r.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
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
          <div className="border-t border-border p-3 text-center">
            <Link
              href={`/catalog?search=${encodeURIComponent(query)}`}
              onClick={onClose}
              aria-label={`Смотреть все результаты поиска по запросу "${query}"`}
              className="text-sm text-primary hover:underline"
            >
              Смотреть все результаты →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
