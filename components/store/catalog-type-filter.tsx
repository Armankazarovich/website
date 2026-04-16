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

  const pillBase = "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap border-2 transition-all shrink-0 active:scale-95";
  const pillActive = "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20";
  const pillInactive = "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/[0.05]";

  return (
    <div className="sticky top-[64px] lg:static lg:top-auto z-40 -mx-4 sm:-mx-6 lg:mx-0 lg:py-0 mb-4 lg:mb-6 bg-background/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none border-b border-border/40 lg:border-none shadow-sm lg:shadow-none">
      <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 sm:px-6 lg:px-0 py-2.5 lg:py-0">
        {category && (
          <Link
            href="/catalog"
            aria-label="Все категории"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/[0.05] transition-all active:scale-95"
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
              className={`${pillBase} ${!currentType ? pillActive : pillInactive}`}
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
              className={`${pillBase} ${isActive ? pillActive : pillInactive}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
