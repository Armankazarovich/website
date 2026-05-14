"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
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
  const dragState = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
  });
  const suppressClickRef = useRef(false);

  // Auto-scroll active pill to center on mobile
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active='true']") as HTMLElement | null;
    if (!active) return;
    const offset = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
  }, [currentType, category]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const container = scrollRef.current;
    if (!container) return;

    dragState.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: container.scrollLeft,
    };
    suppressClickRef.current = false;
    container.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    const container = scrollRef.current;
    if (!state.active || !container || state.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - state.startX;
    if (Math.abs(deltaX) > 4) {
      suppressClickRef.current = true;
      event.preventDefault();
    }
    container.scrollLeft = state.scrollLeft - deltaX;
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (container && dragState.current.pointerId === event.pointerId) {
      container.releasePointerCapture?.(event.pointerId);
    }
    dragState.current.active = false;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  return (
    <div className="sticky top-16 lg:static lg:top-auto z-40 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 pt-1.5 pb-2 lg:py-0 mb-6 bg-background/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none border-b border-border/60 lg:border-none">
      <div
        ref={scrollRef}
        className="flex cursor-grab select-none items-center gap-2 overflow-x-auto scrollbar-none active:cursor-grabbing"
        onClickCapture={handleClickCapture}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onPointerLeave={finishPointerDrag}
      >
        {category && (
          <Link
            prefetch
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
              prefetch
              data-active={!currentType ? "true" : undefined}
              href={`/catalog${q ? `?${q}` : ""}`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
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
              prefetch
              key={t.keyword}
              data-active={isActive ? "true" : undefined}
              href={`/catalog${q ? `?${q}` : ""}`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
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
