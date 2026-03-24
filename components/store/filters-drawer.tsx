"use client";

import { Suspense, useState, useEffect, useRef, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { X, SlidersHorizontal, Filter, ChevronDown, LayoutGrid, Tag } from "lucide-react";
import { useFiltersDrawer } from "@/store/filters-drawer";
import { formatPrice } from "@/lib/utils";

const PRODUCT_TYPES = [
  { label: "Доска обрезная", value: "доска" },
  { label: "Брус / Брусок", value: "брус" },
  { label: "Вагонка", value: "вагонка" },
  { label: "Планкен", value: "планкен" },
  { label: "Блок-хаус", value: "блок-хаус" },
  { label: "Погонаж / Плинтус", value: "плинтус" },
  { label: "Строганная", value: "строганная" },
  { label: "Фанера", value: "фанера" },
  { label: "ДСП / МДФ / ОСБ", value: "дсп" },
];

/* ── Dual range slider ─────────────────────────────────────────── */
function DualRangeSlider({
  min, max, minVal, maxVal, step, onMinChange, onMaxChange,
}: {
  min: number; max: number; minVal: number; maxVal: number;
  step: number; onMinChange: (v: number) => void; onMaxChange: (v: number) => void;
}) {
  const minPercent = max === min ? 0 : ((minVal - min) / (max - min)) * 100;
  const maxPercent = max === min ? 100 : ((maxVal - min) / (max - min)) * 100;

  return (
    <div className="relative h-6 flex items-center select-none">
      {/* Track bg */}
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-muted" />
      {/* Active range */}
      <div
        className="absolute h-1.5 rounded-full bg-primary"
        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
      />
      {/* Min input (transparent, on top) */}
      <input
        type="range" min={min} max={max} step={step} value={minVal}
        onChange={(e) => onMinChange(Math.min(Number(e.target.value), maxVal - step))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: minVal > max - (max - min) * 0.1 ? 5 : 3 }}
      />
      {/* Max input */}
      <input
        type="range" min={min} max={max} step={step} value={maxVal}
        onChange={(e) => onMaxChange(Math.max(Number(e.target.value), minVal + step))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: 4 }}
      />
      {/* Visual thumb min */}
      <div
        className="absolute w-5 h-5 rounded-full bg-primary border-2 border-background shadow-md pointer-events-none transition-transform"
        style={{ left: `${minPercent}%`, transform: "translateX(-50%)", zIndex: 6 }}
      />
      {/* Visual thumb max */}
      <div
        className="absolute w-5 h-5 rounded-full bg-primary border-2 border-background shadow-md pointer-events-none transition-transform"
        style={{ left: `${maxPercent}%`, transform: "translateX(-50%)", zIndex: 6 }}
      />
    </div>
  );
}

/* ── Main filters content ──────────────────────────────────────── */
function FiltersContent({ onClose }: { onClose: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentType = searchParams.get("type") ?? "";
  const currentSize = searchParams.get("size") ?? "";
  const currentCategory = searchParams.get("category") ?? "";

  // Price state (local, navigate on change with debounce)
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [globalMin, setGlobalMin] = useState(0);
  const [globalMax, setGlobalMax] = useState(100000);
  const currentMinPrice = searchParams.get("minprice") ? Number(searchParams.get("minprice")) : null;
  const currentMaxPrice = searchParams.get("maxprice") ? Number(searchParams.get("maxprice")) : null;

  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[] | undefined>(undefined);

  const [catOpen, setCatOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(true);
  const [typeOpen, setTypeOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(!!currentSize);

  const fetchedRef = useRef(false);
  const priceDebounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/catalog/sizes").then(r => r.json()).then(d => setSizes(d.sizes ?? [])).catch(() => {});
    fetch("/api/catalog/categories").then(r => r.json()).then(d => setCategories(d.categories ?? [])).catch(() => {});
    fetch("/api/catalog/price-range").then(r => r.json()).then(d => {
      setGlobalMin(d.min ?? 0);
      setGlobalMax(d.max ?? 100000);
      setPriceRange([currentMinPrice ?? d.min ?? 0, currentMaxPrice ?? d.max ?? 100000]);
    }).catch(() => {
      setPriceRange([currentMinPrice ?? 0, currentMaxPrice ?? 100000]);
    });

    const url = currentCategory
      ? `/api/catalog/available-types?category=${encodeURIComponent(currentCategory)}`
      : "/api/catalog/available-types";
    fetch(url).then(r => r.json()).then(d => setAvailableTypes(d.types ?? undefined)).catch(() => {});
  }, [currentCategory, currentMinPrice, currentMaxPrice]);

  const createUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      params.delete("page");
      const query = params.toString();
      return `/catalog${query ? `?${query}` : ""}`;
    },
    [searchParams]
  );

  const navigate = (url: string) => {
    startTransition(() => router.push(url));
  };

  const resetAll = () => {
    startTransition(() => {
      router.push("/catalog");
      onClose();
    });
  };

  const handlePriceChange = (min: number, max: number) => {
    setPriceRange([min, max]);
    clearTimeout(priceDebounce.current);
    priceDebounce.current = setTimeout(() => {
      navigate(createUrl({
        minprice: min > globalMin ? String(min) : null,
        maxprice: max < globalMax ? String(max) : null,
      }));
    }, 600);
  };

  const activeCount = [
    currentType, currentSize, currentCategory,
    currentMinPrice !== null ? "1" : "",
    currentMaxPrice !== null ? "1" : "",
  ].filter(Boolean).length;

  const displayMin = priceRange?.[0] ?? globalMin;
  const displayMax = priceRange?.[1] ?? globalMax;

  return (
    <div className={`space-y-3 ${isPending ? "opacity-60" : ""} transition-opacity`}>

      {/* Reset all */}
      {activeCount > 0 && (
        <button
          onClick={resetAll}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Сбросить все ({activeCount})
        </button>
      )}

      {/* Categories */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setCatOpen(!catOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
        >
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
            Категория
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {currentCategory && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">1</span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {catOpen && (
          <div className="px-3 pb-3 border-t border-border">
            <div className="space-y-0.5 mt-2">
              <button
                onClick={() => navigate(createUrl({ category: null }))}
                className={`w-full flex items-center px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                  !currentCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Все категории
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => navigate(createUrl({ category: currentCategory === cat.slug ? null : cat.slug }))}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                    currentCategory === cat.slug
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price range */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setPriceOpen(!priceOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
        >
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
            Цена за м³
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {(currentMinPrice !== null || currentMaxPrice !== null) && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">1</span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${priceOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {priceOpen && priceRange && (
          <div className="px-5 pb-5 border-t border-border">
            <div className="flex items-center justify-between mt-4 mb-5">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">от</p>
                <p className="font-display font-bold text-base text-primary">{formatPrice(displayMin)}</p>
              </div>
              <div className="h-px flex-1 mx-3 bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">до</p>
                <p className="font-display font-bold text-base text-primary">{formatPrice(displayMax)}</p>
              </div>
            </div>
            <DualRangeSlider
              min={globalMin} max={globalMax}
              minVal={displayMin} maxVal={displayMax}
              step={1000}
              onMinChange={(v) => handlePriceChange(v, displayMax)}
              onMaxChange={(v) => handlePriceChange(displayMin, v)}
            />
            {(currentMinPrice !== null || currentMaxPrice !== null) && (
              <button
                onClick={() => {
                  setPriceRange([globalMin, globalMax]);
                  navigate(createUrl({ minprice: null, maxprice: null }));
                }}
                className="mt-4 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Сбросить цену
              </button>
            )}
          </div>
        )}
      </div>

      {/* Type filter */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setTypeOpen(!typeOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
        >
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
            Тип товара
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {currentType && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">1</span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${typeOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {typeOpen && (
          <div className="px-5 pb-5 border-t border-border">
            {currentType && (
              <button
                onClick={() => navigate(createUrl({ type: null }))}
                className="mt-3 mb-2 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Сбросить
              </button>
            )}
            <div className={`flex flex-wrap gap-2 ${currentType ? "" : "mt-3"}`}>
              {(availableTypes
                ? PRODUCT_TYPES.filter(t => availableTypes.includes(t.value))
                : PRODUCT_TYPES
              ).map(t => (
                <button
                  key={t.value}
                  onClick={() => navigate(createUrl({ type: currentType === t.value ? null : t.value }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    currentType === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:border-primary/50 hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size filter */}
      {sizes.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setSizeOpen(!sizeOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
          >
            <h3 className="font-display font-semibold text-sm">Сечение</h3>
            <div className="flex items-center gap-2 shrink-0">
              {currentSize && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">1</span>
              )}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${sizeOpen ? "rotate-180" : ""}`} />
            </div>
          </button>
          {sizeOpen && (
            <div className="px-5 pb-5 border-t border-border">
              {currentSize && (
                <button
                  onClick={() => navigate(createUrl({ size: null }))}
                  className="mt-3 mb-2 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Сбросить
                </button>
              )}
              <div className={`flex flex-wrap gap-2 ${currentSize ? "" : "mt-3"}`}>
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => navigate(createUrl({ size: currentSize === size ? null : size }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      currentSize === size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background hover:border-primary/50 hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Drawer shell ──────────────────────────────────────────────── */
export function FiltersDrawer() {
  const { open, setOpen } = useFiltersDrawer();

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
            className="relative w-[88vw] max-w-[360px] h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">Фильтры</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                aria-label="Закрыть фильтры"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <Suspense fallback={
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-muted rounded-2xl animate-pulse" />
                  ))}
                </div>
              }>
                <FiltersContent onClose={() => setOpen(false)} />
              </Suspense>
            </div>

            <div className="px-5 pb-8 pt-3 border-t border-border shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
              >
                Применить фильтры
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
