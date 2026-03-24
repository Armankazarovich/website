"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useState } from "react";
import { Filter, X, ChevronDown, Ruler } from "lucide-react";

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

interface CatalogFiltersProps {
  currentInStock: boolean;
  currentSize: string;
  sizes: string[];
  currentType?: string;
  availableTypes?: string[];
  onClose?: () => void;
}

export function CatalogFilters({
  currentSize,
  sizes,
  currentType = "",
  availableTypes,
  onClose,
}: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [typeOpen, setTypeOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

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

  return (
    <div className={`space-y-3 ${isPending ? "opacity-60" : ""} transition-opacity`}>

      {/* Type filter — accordion, closed by default */}
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
                Сбросить
              </button>
            )}
            <div className={`flex flex-wrap gap-2 ${currentType ? "" : "mt-3"}`}>
              {(availableTypes ? PRODUCT_TYPES.filter(t => availableTypes.includes(t.value)) : PRODUCT_TYPES).map((t) => (
                <button
                  key={t.value}
                  onClick={() =>
                    navigate(createUrl({ type: currentType === t.value ? null : t.value }))
                  }
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

      {/* Size filter — accordion, closed by default */}
      {sizes.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setSizeOpen(!sizeOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
          >
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Ruler className="w-3.5 h-3.5 text-primary shrink-0" />
              Размеры
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {currentSize && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  1
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
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      navigate(createUrl({ size: currentSize === size ? null : size }))
                    }
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
