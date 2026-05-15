"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Banknote, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { cn } from "@/lib/utils";

interface TypeInfo {
  label: string;
  keyword: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CatalogMobileFilterProps {
  categories: Category[];
  sizes: string[];
  types: TypeInfo[];
  currentCategory?: string;
  currentSize: string;
  currentType: string;
  currentInStock: boolean;
  currentMinPrice?: number | null;
  currentMaxPrice?: number | null;
  priceRange?: { min: number; max: number };
}

export function CatalogMobileFilter({
  categories,
  sizes,
  types,
  currentCategory,
  currentSize,
  currentType,
  currentInStock,
  currentMinPrice = null,
  currentMaxPrice = null,
  priceRange = { min: 0, max: 0 },
}: CatalogMobileFilterProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [catOpen, setCatOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(false);
  const [draftMinPrice, setDraftMinPrice] = useState<number | null>(null);
  const [draftMaxPrice, setDraftMaxPrice] = useState<number | null>(null);
  const dragStartY = useRef(0);
  useAdminOverlayGuard(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Count active filters controlled by this mobile drawer.
  const activeCount = [
    currentCategory,
    currentSize,
    currentType,
    currentInStock ? "instock" : "",
    currentMinPrice !== null || currentMaxPrice !== null ? "price" : "",
  ].filter(Boolean).length;
  const hasPriceRange = priceRange.max > priceRange.min && priceRange.max > 0;
  const selectedMinPrice = currentMinPrice ?? priceRange.min;
  const selectedMaxPrice = currentMaxPrice ?? priceRange.max;
  const effectiveMinPrice = draftMinPrice ?? selectedMinPrice;
  const effectiveMaxPrice = draftMaxPrice ?? selectedMaxPrice;
  const priceSpread = Math.max(1, priceRange.max - priceRange.min);
  const minPricePercent = Math.min(100, Math.max(0, ((effectiveMinPrice - priceRange.min) / priceSpread) * 100));
  const maxPricePercent = Math.min(100, Math.max(0, ((effectiveMaxPrice - priceRange.min) / priceSpread) * 100));
  const priceStep = Math.max(100, Math.round(priceSpread / 80 / 100) * 100);
  const formatRub = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

  useEffect(() => {
    setDraftMinPrice(null);
    setDraftMaxPrice(null);
  }, [currentMinPrice, currentMaxPrice, priceRange.min, priceRange.max]);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const toggleInstock = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentInStock) {
      params.delete("instock");
    } else {
      params.set("instock", "1");
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const applyPrice = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (effectiveMinPrice > priceRange.min) params.set("minprice", String(Math.round(effectiveMinPrice)));
    else params.delete("minprice");
    if (effectiveMaxPrice < priceRange.max) params.set("maxprice", String(Math.round(effectiveMaxPrice)));
    else params.delete("maxprice");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetPrice = () => {
    setDraftMinPrice(null);
    setDraftMaxPrice(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("minprice");
    params.delete("maxprice");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetAll = () => {
    router.push(pathname);
    setOpen(false);
  };

  const filterLayer = (
    <>
      {/* Floating trigger — sticky left side, middle of screen */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[55] lg:hidden flex w-8 flex-col items-center justify-center gap-0.5 rounded-r-xl border-y border-r border-border bg-card/95 px-0 py-2 shadow-xl backdrop-blur-md transition-all active:scale-95"
        aria-label="Открыть фильтры"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-foreground" />
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground shadow-sm">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[210] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[220] bg-card rounded-t-3xl overflow-hidden"
              style={{ maxHeight: "82dvh", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle — свайп вниз = закрыть */}
              <div
                className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
                onTouchStart={(e) => { dragStartY.current = e.touches[0].clientY; }}
                onTouchEnd={(e) => {
                  const dy = e.changedTouches[0].clientY - dragStartY.current;
                  if (dy > 60) setOpen(false);
                }}
              >
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25 active:bg-muted-foreground/50 transition-colors" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                <p className="font-semibold text-base">Фильтры</p>
                <div className="flex items-center gap-3">
                  {activeCount > 0 && (
                    <button onClick={resetAll} className="text-xs text-primary hover:underline">
                      Сбросить всё
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(82dvh - 160px)" }}>
                <div className="px-5 py-4 space-y-5">

                  {/* В наличии toggle */}
                  <button
                    onClick={toggleInstock}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all",
                      currentInStock
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-3 h-3 rounded-full transition-colors",
                        currentInStock ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      <span className="text-sm font-medium">Только в наличии</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full transition-colors relative",
                      currentInStock ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        currentInStock ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>

                  {/* Categories */}
                  <div>
                    <button
                      onClick={() => setCatOpen(!catOpen)}
                      className="w-full flex items-center justify-between py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Категория
                      {catOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {catOpen && (
                      <div className="mt-2 space-y-1">
                        <button
                          onClick={() => { setParam("category", null); }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                            !currentCategory
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          Все категории
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { setParam("category", cat.slug); }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                              currentCategory === cat.slug
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sizes — smart grouped */}
                  {sizes.length > 0 && (
                    <div>
                      <button
                        onClick={() => setSizeOpen(!sizeOpen)}
                        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        Размеры
                        {sizeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {sizeOpen && (
                        <div className="mt-2 max-h-[260px] overflow-y-auto scrollbar-thin space-y-2">
                          {sizes.map(size => (
                            <button
                              key={size}
                              onClick={() => setParam("size", currentSize === size ? null : size)}
                              className={cn(
                                "inline-flex mr-1.5 mb-1.5 px-3 py-2.5 rounded-lg text-sm font-mono border transition-all",
                                currentSize === size
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {hasPriceRange && (
                    <div>
                      <button
                        onClick={() => setPriceOpen(!priceOpen)}
                        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-primary" />
                          Цена
                        </span>
                        {priceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {priceOpen && (
                        <div className="mt-2 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs text-muted-foreground">Диапазон</span>
                            <strong className="text-right text-sm">
                              {formatRub(effectiveMinPrice)} – {formatRub(effectiveMaxPrice)}
                            </strong>
                          </div>
                          <div className="relative h-8">
                            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
                            <div
                              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
                              style={{
                                left: `${minPricePercent}%`,
                                right: `${100 - maxPricePercent}%`,
                              }}
                            />
                            <input
                              aria-label="Минимальная цена"
                              className="catalog-price-range absolute inset-0"
                              type="range"
                              min={priceRange.min}
                              max={priceRange.max}
                              step={priceStep}
                              value={effectiveMinPrice}
                              onChange={(event) => {
                                const next = Math.min(Number(event.currentTarget.value), effectiveMaxPrice);
                                setDraftMinPrice(next);
                              }}
                            />
                            <input
                              aria-label="Максимальная цена"
                              className="catalog-price-range absolute inset-0"
                              type="range"
                              min={priceRange.min}
                              max={priceRange.max}
                              step={priceStep}
                              value={effectiveMaxPrice}
                              onChange={(event) => {
                                const next = Math.max(Number(event.currentTarget.value), effectiveMinPrice);
                                setDraftMaxPrice(next);
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{formatRub(priceRange.min)}</span>
                            <span>{formatRub(priceRange.max)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={applyPrice}
                              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                            >
                              Применить
                            </button>
                            <button
                              type="button"
                              onClick={resetPrice}
                              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground"
                            >
                              Сбросить
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Types */}
                  {types.length > 0 && (
                    <div>
                      <p className="py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Тип</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {types.map(t => (
                          <button
                            key={t.keyword}
                            onClick={() => setParam("type", currentType === t.keyword ? null : t.keyword)}
                            className={cn(
                              "px-3 py-2.5 rounded-lg text-sm border transition-all",
                              currentType === t.keyword
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border/50 bg-card">
                <button
                  onClick={() => setOpen(false)}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  Показать товары
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <div className="shrink-0 w-0" />
      {mounted ? createPortal(filterLayer, document.body) : null}
    </>
  );
}
