"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useState, useMemo } from "react";
import { Filter, X, ChevronDown, Ruler } from "lucide-react";

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
  onClose,
}: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [typeOpen, setTypeOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [expandedCS, setExpandedCS] = useState<string | null>(null);

  // Определяем формат размеров: сечение (25×100) или листовые (18 мм)
  const hasCrossSections = useMemo(
    () => sizes.some(s => isCrossSectionFormat(s)),
    [sizes]
  );
  const sizeLabel = hasCrossSections ? "Сечение" : "Размер";

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
              <div className={`flex flex-wrap gap-2 ${currentType ? "" : "mt-3"}`}>
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
                  <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin pr-1">
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
                      <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium">Сечение {visibleCS} — длины:</p>
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
                    {crossSections.length} сечений · {sizes.length} размеров
                  </p>
                </div>
              ) : (
                /* ── Flat mode: мало размеров — простой список ── */
                <div className={`flex flex-wrap gap-2 ${currentSize ? "" : "mt-3"}`}>
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
    </div>
  );
}
