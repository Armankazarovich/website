"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface CatalogTypeFilterProps {
  currentType: string;
  category?: string;
  availableTypes: string[];
}

const typeFilters = [
  { label: "Все", type: "", icon: null },
  {
    label: "Доска", type: "доска",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="2" y="14" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
  },
  {
    label: "Брус", type: "брус",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M6 6v12M18 6v12" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5"/></svg>,
  },
  {
    label: "Вагонка", type: "вагонка",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M2 7h20M2 12h20M2 17h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  },
  {
    label: "Блок-хаус", type: "блок-хаус",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M2 8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8z" stroke="currentColor" strokeWidth="1.7"/><path d="M2 15c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-2z" stroke="currentColor" strokeWidth="1.7"/></svg>,
  },
  {
    label: "Планкен", type: "планкен",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M2 9h20M2 15h20" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.5"/></svg>,
  },
  {
    label: "Фанера", type: "фанера",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="10" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/></svg>,
  },
  {
    label: "Строганная", type: "строганная",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  },
];

export function CatalogTypeFilter({ currentType, category, availableTypes }: CatalogTypeFilterProps) {
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

  const visibleFilters = typeFilters.filter(
    (f) => !f.type || availableTypes.includes(f.type)
  );

  return (
    <div className="sticky top-[68px] md:top-24 lg:static lg:top-auto z-40 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 py-2 lg:py-0 mb-6 bg-background/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none border-b border-border lg:border-none">
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
        {visibleFilters.map((f) => {
          const isActive = currentType === f.type;
          return (
            <Link
              key={f.type}
              data-active={isActive ? "true" : undefined}
              href={`/catalog?${new URLSearchParams({
                ...(f.type ? { type: f.type } : {}),
                ...(category ? { category } : {}),
              }).toString()}`}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent"
              }`}
            >
              {f.icon && (
                <span className={isActive ? "text-primary-foreground" : "text-muted-foreground"}>
                  {f.icon}
                </span>
              )}
              {f.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
