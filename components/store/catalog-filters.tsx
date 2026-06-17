"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useTransition, useState, useMemo } from "react";
import { Banknote, Filter, X, ChevronDown, Ruler } from "lucide-react";

interface TypeInfo {
  label: string;
  keyword: string;
}

interface CatalogFiltersProps {
  currentInStock: boolean;
  currentSize: string;
  sizes: string[];
  currentType?: string;
  types?: TypeInfo[];
  currentMinPrice?: number | null;
  currentMaxPrice?: number | null;
  priceRange?: { min: number; max: number };
  onClose?: () => void;
}

/** Проверяет, является ли размер форматом сечения (содержит ×) */
const isCrossSectionFormat = (s: string) => /\d+\s*[×xXхХ]\s*\d+/.test(s);

/** Извлекает сечение (первые 2 числа) из полного размера: "25×100×6000" → "25×100" */
function getCrossSection(size: string): string {
  if (!isCrossSectionFormat(size)) return size;
  const nums = size.match(/\d+/g);
  if (!nums || nums.length < 2) return size;
  return `${nums[0]}×${nums[1]}`;
}

/** Группирует полные размеры по сечению: "25×100" → ["25×100×3000", "25×100×6000"] */
function groupSizesByCrossSection(sizes: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const s of sizes) {
    const cs = getCrossSection(s);
    if (!map.has(cs)) map.set(cs, []);
    map.get(cs)!.push(s);
  }
  return map;
}

export function CatalogFilters({
  currentSize,
  sizes,
  currentType = "",
  types = [],
  currentMinPrice = null,
  currentMaxPrice = null,
  priceRange = { min: 0, max: 0 },
  onClose,
}: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [typeOpen, setTypeOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [expandedCS, setExpandedCS] = useState<string | null>(null);
  const [draftMinPrice, setDraftMinPrice] = useState<number | null>(null);
  const [draftMaxPrice, setDraftMaxPrice] = useState<number | null>(null);

  // Определяем формат размеров: сечение (25×100) или листовые (18 мм)
  const hasCrossSections = useMemo(
    () => sizes.some(s => isCrossSectionFormat(s)),
    [sizes]
  );
  const hasSheetSizes = useMemo(
    () => sizes.some((s) => /(?:мм|\d+\s*[×xXхХ]\s*\d+)/i.test(s) && !/\d+\s*[×xXхХ]\s*\d+\s*[×xXхХ]\s*\d+/.test(s)),
    [sizes],
  );
  const sizeLabel = hasCrossSections && !hasSheetSizes ? "Сечение и длина" : "Толщина и формат";

  // Группировка по сечению (только для формата с ×)
  const grouped = useMemo(() => groupSizesByCrossSection(sizes), [sizes]);
  const crossSections = useMemo(() => {
    return Array.from(grouped.keys()).sort((a, b) => {
      const aNums = a.match(/\d+/g)?.map(Number) || [0];
      const bNums = b.match(/\d+/g)?.map(Number) || [0];
      for (let i = 0; i < Math.max(aNums.length, bNums.length); i++) {
        const diff = (aNums[i] || 0) - (bNums[i] || 0);
        if (diff !== 0) return diff;
      }
      return a.localeCompare(b);
    });
  }, [grouped]);

  // Авто-раскрытие группы выбранного размера
  const activeCS = currentSize ? getCrossSection(currentSize) : null;
  const visibleCS = expandedCS ?? activeCS;

  const createUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      params.delete("page");
      const query = params.toString();
      return `/catalog${query ? `?${query}` : ""}`;
    },
    [searchParams]
  );

  const navigate = (url: string) => {
    startTransition(() => {
      router.push(url);
      onClose?.();
    });
  };

  const currentTypeLabel = types.find(t => t.keyword === currentType)?.label || currentType;

  const hasPriceRange = priceRange.max > priceRange.min && priceRange.max > 0;
  const selectedMinPrice = currentMinPrice ?? priceRange.min;
  const selectedMaxPrice = currentMaxPrice ?? priceRange.max;
  const effectiveMinPrice = draftMinPrice ?? selectedMinPrice;
  const effectiveMaxPrice = draftMaxPrice ?? selectedMaxPrice;
  const priceSpread = Math.max(1, priceRange.max - priceRange.min);
  const minPricePercent = Math.min(100, Math.max(0, ((effectiveMinPrice - priceRange.min) / priceSpread) * 100));
  const maxPricePercent = Math.min(100, Math.max(0, ((effectiveMaxPrice - priceRange.min) / priceSpread) * 100));
  const hasActivePrice =
    currentMinPrice !== null ||
    currentMaxPrice !== null ||
    draftMinPrice !== null ||
    draftMaxPrice !== null;
  const priceStep = Math.max(100, Math.round(priceSpread / 80 / 100) * 100);
  const formatRub = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

  useEffect(() => {
    setDraftMinPrice(null);
    setDraftMaxPrice(null);
  }, [currentMinPrice, currentMaxPrice, priceRange.min, priceRange.max]);

  const applyPrice = (min: number, max: number) => {
    navigate(
      createUrl({
        minprice: min > priceRange.min ? String(Math.round(min)) : null,
        maxprice: max < priceRange.max ? String(Math.round(max)) : null,
      }),
    );
  };

  // Порог: группировка только если есть сечения (×) И размеров много
  const useGroups = hasCrossSections && sizes.length > 12;

  return (
    <div className={`space-y-3 ${isPending ? "opacity-60" : ""} transition-opacity`}>

      {/* Type filter — accordion */}
      {types.length > 0 && (
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
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  1
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  typeOpen ? "rotate-180" : ""
                }`}
              />
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
                  Сбросить ({currentTypeLabel})
                </button>
              )}
              <div className={`catalog-filter-inner-scroll flex max-h-[260px] flex-wrap gap-2 overflow-y-auto pr-1 ${currentType ? "" : "mt-3"}`}>
                {types.map((t) => (
                  <button
                    key={t.keyword}
                    onClick={() =>
                      navigate(createUrl({ type: currentType === t.keyword ? null : t.keyword }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      currentType === t.keyword
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
      )}

      {/* Size filter — smart grouped */}
      {sizes.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setSizeOpen(!sizeOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
          >
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Ruler className="w-3.5 h-3.5 text-primary shrink-0" />
              {sizeLabel}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {currentSize && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium truncate max-w-[80px]">
                  {currentSize}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  sizeOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {sizeOpen && (
            <div className="px-5 pb-4 border-t border-border">
              {currentSize && (
                <button
                  onClick={() => { navigate(createUrl({ size: null })); setExpandedCS(null); }}
                  className="mt-3 mb-2 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Сбросить ({currentSize})
                </button>
              )}

              {useGroups ? (
                /* ── Grouped mode: сечения → раскрытие полных размеров ── */
                <div className="mt-3 space-y-2.5">
                  {/* Сечения (первые 2 числа) */}
                  <div className="catalog-filter-inner-scroll flex max-h-[200px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {crossSections.map((cs) => {
                      const isExpanded = visibleCS === cs;
                      const hasActive = activeCS === cs;
                      const count = grouped.get(cs)!.length;
                      return (
                        <button
                          key={cs}
                          onClick={() => setExpandedCS(isExpanded && !hasActive ? null : cs)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                            isExpanded
                              ? hasActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-primary/10 text-primary border-primary/40"
                              : hasActive
                                ? "bg-primary/15 text-primary border-primary/30 ring-1 ring-primary/20"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {cs}
                          {count > 1 && <span className="text-[9px] opacity-60">({count})</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Полные размеры выбранного сечения */}
                  {visibleCS && grouped.has(visibleCS) && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium">Размер {visibleCS} — варианты:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {grouped.get(visibleCS)!.map((size) => (
                          <button
                            key={size}
                            onClick={() => navigate(createUrl({ size: currentSize === size ? null : size }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
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

                  <p className="text-[10px] text-muted-foreground/40">
                    {crossSections.length} сечений · {sizes.length} вариантов
                  </p>
                </div>
              ) : (
                /* ── Flat mode: мало размеров — простой список ── */
                <div className={`catalog-filter-inner-scroll flex max-h-[260px] flex-wrap gap-2 overflow-y-auto pr-1 ${currentSize ? "" : "mt-3"}`}>
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => navigate(createUrl({ size: currentSize === size ? null : size }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                        currentSize === size
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasPriceRange && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setPriceOpen(!priceOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
          >
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Banknote className="w-3.5 h-3.5 text-primary shrink-0" />
              Цена
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {hasActivePrice && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  1
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  priceOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {priceOpen && (
            <div className="space-y-3 border-t border-border px-5 pb-5 pt-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Диапазон
                  </span>
                  <strong className="text-right text-base font-semibold leading-tight">
                    {formatRub(effectiveMinPrice)} – {formatRub(effectiveMaxPrice)}
                  </strong>
                </div>

                <div className="relative mt-4 h-8">
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

                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatRub(priceRange.min)}</span>
                  <span>{formatRub(priceRange.max)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyPrice(effectiveMinPrice, effectiveMaxPrice)}
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Применить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftMinPrice(null);
                    setDraftMaxPrice(null);
                    navigate(createUrl({ minprice: null, maxprice: null }));
                  }}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  Сбросить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
