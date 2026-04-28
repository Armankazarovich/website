"use client";

/**
 * AdminHeaderSearch — гибридный поиск в шапке админки.
 *
 * Видение Армана (28.04.2026 вечер): «можно интерактивный умный поиск который
 * предложит несколько вариантов релевантных красивых выпадающими архитектурами»
 * — то есть inline dropdown как Google Search Suggestions / Ozon / Linear.
 *
 * Архитектура:
 *  1. Input поля в центре шапки (max-w-3xl, h-11, rounded-2xl).
 *  2. При фокусе и наличии текста (>= 1 символ) — inline dropdown под input
 *     с suggestions: разделы (instant) + товары (debounced 250мс).
 *  3. Клик в dropdown ведёт на страницу.
 *  4. Кнопка "Расширенный поиск" в правом краю input → открывает
 *     полный side-panel слева (Cmd+K тоже его открывает).
 *  5. Click outside / Escape — закрывает dropdown.
 *  6. Стрелки ↑↓ + Enter — навигация по suggestions клавиатурой.
 *
 * Стиль: 1-в-1 в духе магазинного search-modal — bg-card, rounded-2xl,
 * shadow-2xl, divide-y, плавная анимация (animate-in fade-in slide-in-from-top-1).
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, ArrowRight, Package, ChevronRight, Command,
  ShoppingBag, UserCircle,
} from "lucide-react";
import { allNavItems, GROUP_LABELS } from "@/components/admin/admin-nav";
import { useAdminLang } from "@/lib/admin-lang-context";
import { formatPrice } from "@/lib/utils";

interface ProductResult {
  id: string;
  slug: string;
  name: string;
  category: { name: string };
  images: string[];
  saleUnit: string;
  variants: { pricePerCube: number | null; pricePerPiece: number | null }[];
}

type Suggestion =
  | { kind: "section"; href: string; label: string; group: string; icon: React.ElementType }
  | { kind: "product"; href: string; label: string; category: string; image: string | null; price: number | null }
  | { kind: "openPanel"; label: string };

interface Props {
  role: string;
  onOpenFullSearch: () => void;
}

export function AdminHeaderSearch({ role, onOpenFullSearch }: Props) {
  const router = useRouter();
  const { t } = useAdminLang();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUser = role === "USER";

  // ── Debounced product search ──
  useEffect(() => {
    if (query.trim().length < 2) {
      setProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setProducts((data.results || []).slice(0, 3));
        }
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Click outside → close ──
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  // ── Filtered sections by query (max 4) ──
  const matchedSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const visible = allNavItems.filter(i => !i.roles || i.roles.includes(role));
    return visible
      .filter((i) => {
        const label = (i.labelKey ? t(i.labelKey) : i.label).toLowerCase();
        const groupLabel = (GROUP_LABELS[i.group] || "").toLowerCase();
        return label.includes(q) || groupLabel.includes(q);
      })
      .slice(0, 4);
  }, [query, role, t]);

  // ── Combined suggestions для клавиатурной навигации ──
  const suggestions = useMemo<Suggestion[]>(() => {
    const items: Suggestion[] = [];
    matchedSections.forEach((s) => {
      items.push({
        kind: "section",
        href: s.href,
        label: s.labelKey ? t(s.labelKey) : s.label,
        group: GROUP_LABELS[s.group] || s.group,
        icon: s.icon,
      });
    });
    products.forEach((p) => {
      const minPrice = p.variants.reduce((min, v) => {
        const price = v.pricePerCube ?? v.pricePerPiece;
        return price !== null && price < min ? price : min;
      }, Infinity);
      items.push({
        kind: "product",
        href: `/product/${p.slug}`,
        label: p.name,
        category: p.category.name,
        image: p.images[0] || null,
        price: minPrice === Infinity ? null : minPrice,
      });
    });
    items.push({ kind: "openPanel", label: "Открыть расширенный поиск" });
    return items;
  }, [matchedSections, products, t]);

  // Reset activeIndex когда меняется query
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!focused || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = suggestions[activeIndex];
        if (target.kind === "openPanel") {
          onOpenFullSearch();
          setFocused(false);
        } else {
          router.push(target.href);
          setFocused(false);
          setQuery("");
        }
      } else if (e.key === "Escape") {
        setFocused(false);
        inputRef.current?.blur();
      }
    },
    [focused, suggestions, activeIndex, router, onOpenFullSearch]
  );

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl">
      {/* Input */}
      <div
        className={`flex items-center gap-2.5 w-full h-11 px-4 rounded-2xl bg-muted/50 border transition-all
          ${focused ? "border-primary/50 bg-background ring-2 ring-primary/15" : "border-border"}`}
      >
        <Search
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${focused ? "text-primary" : "text-muted-foreground"}`}
          strokeWidth={1.75}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={isUser ? "Доска, брус, вагонка…" : "Поиск раздела, товара, заказа, клиента…"}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-0"
          style={{ fontSize: 16 }}
          aria-label="Поиск"
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
        />
        {loadingProducts && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />}
        <button
          type="button"
          onClick={() => {
            onOpenFullSearch();
            setFocused(false);
            inputRef.current?.blur();
          }}
          className="hidden md:inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 shrink-0 hover:text-foreground transition-colors"
          aria-label="Расширенный поиск"
          title="Расширенный поиск (⌘K)"
        >
          <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">K</kbd>
        </button>
      </div>

      {/* Inline dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          role="listbox"
        >
          {/* Sections группа */}
          {matchedSections.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Разделы
              </div>
              <div>
                {matchedSections.map((s, idx) => {
                  const SectionIcon = s.icon;
                  const label = s.labelKey ? t(s.labelKey) : s.label;
                  const groupLabel = GROUP_LABELS[s.group] || "";
                  const isActive = idx === activeIndex;
                  return (
                    <Link
                      key={s.href}
                      href={s.href}
                      onClick={() => {
                        setFocused(false);
                        setQuery("");
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isActive ? "bg-primary/8" : "hover:bg-muted/40"}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                      >
                        <SectionIcon className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-tight truncate">{label}</p>
                        {groupLabel && (
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                            {groupLabel}
                          </p>
                        )}
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/40"}`}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products группа */}
          {products.length > 0 && (
            <div className={matchedSections.length > 0 ? "border-t border-border" : ""}>
              <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Товары
              </div>
              <div>
                {products.map((p, productIdx) => {
                  const idx = matchedSections.length + productIdx;
                  const isActive = idx === activeIndex;
                  const minPrice = p.variants.reduce((min, v) => {
                    const price = v.pricePerCube ?? v.pricePerPiece;
                    return price !== null && price < min ? price : min;
                  }, Infinity);
                  return (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      onClick={() => {
                        setFocused(false);
                        setQuery("");
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isActive ? "bg-primary/8" : "hover:bg-muted/40"}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-muted shrink-0">
                        {p.images[0] ? (
                          <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="36px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground opacity-50" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-tight line-clamp-1">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                          {p.category.name}
                        </p>
                      </div>
                      {minPrice !== Infinity && (
                        <p className="text-sm font-semibold text-primary shrink-0">от {formatPrice(minPrice)}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state когда нечего показать */}
          {!loadingProducts && matchedSections.length === 0 && products.length === 0 && query.trim().length >= 2 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                По запросу «{query}» ничего не найдено
              </p>
            </div>
          )}

          {/* Footer — Открыть полный поиск */}
          <button
            type="button"
            onClick={() => {
              onOpenFullSearch();
              setFocused(false);
            }}
            onMouseEnter={() => setActiveIndex(suggestions.length - 1)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 border-t border-border transition-colors ${activeIndex === suggestions.length - 1 ? "bg-primary/8" : "hover:bg-muted/40"}`}
          >
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Command className="w-3.5 h-3.5" strokeWidth={1.75} />
              Расширенный поиск
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          </button>
        </div>
      )}
    </div>
  );
}
