"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TypeInfo {
  label: string;
  keyword: string;
}

interface CatalogTypeFilterProps {
  currentType: string;
  category?: string;
  types: TypeInfo[];
  /** All current search params to preserve when switching type */
  preserveParams?: Record<string, string>;
}

export function CatalogTypeFilter({ currentType, category, types, preserveParams = {} }: CatalogTypeFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active pill to center on mobile
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active='true']") as HTMLElement | null;
    if (!active) return;
    const offset = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
  }, [currentType, category]);

  return (
    <div className="sticky top-16 lg:static lg:top-auto z-40 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 pt-1.5 pb-2 lg:py-0 mb-6 bg-background/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none border-b border-border/60 lg:border-none">
      <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {category && (
          <Link
            href="/catalog"
            aria-label="Все категории"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border shrink-0 border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}

        {/* Кнопка "Все" */}
        {(() => {
          const params = new URLSearchParams(preserveParams);
          if (category) params.set("category", category);
          params.delete("type");
          params.delete("page");
          const q = params.toString();
          return (
            <Link
              data-active={!currentType ? "true" : undefined}
              href={`/catalog${q ? `?${q}` : ""}`}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all shrink-0 ${
                !currentType
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent"
              }`}
            >
              Все
            </Link>
          );
        })()}

        {/* Динамические типы из реальных данных */}
        {types.map((t) => {
          const isActive = currentType === t.keyword;
          const params = new URLSearchParams(preserveParams);
          if (category) params.set("category", category);
          params.set("type", t.keyword);
          params.delete("page");
          const q = params.toString();
          return (
            <Link
              key={t.keyword}
              data-active={isActive ? "true" : undefined}
              href={`/catalog${q ? `?${q}` : ""}`}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
