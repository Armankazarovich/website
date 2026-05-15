"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, WheelEvent } from "react";
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const canScrollLeftRef = useRef(false);
  const canScrollRightRef = useRef(false);
  const scrollStateFrame = useRef<number | null>(null);
  const dragState = useRef({
    active: false,
    dragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
  });
  const suppressClickRef = useRef(false);

  const applyScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const maxLeft = container.scrollWidth - container.clientWidth;
    const nextLeft = container.scrollLeft > 6;
    const nextRight = container.scrollLeft < maxLeft - 6;

    if (nextLeft !== canScrollLeftRef.current) {
      canScrollLeftRef.current = nextLeft;
      setCanScrollLeft(nextLeft);
    }
    if (nextRight !== canScrollRightRef.current) {
      canScrollRightRef.current = nextRight;
      setCanScrollRight(nextRight);
    }
  }, []);

  const updateScrollState = useCallback(() => {
    if (scrollStateFrame.current !== null) return;
    scrollStateFrame.current = window.requestAnimationFrame(() => {
      scrollStateFrame.current = null;
      applyScrollState();
    });
  }, [applyScrollState]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      if (scrollStateFrame.current !== null) {
        window.cancelAnimationFrame(scrollStateFrame.current);
        scrollStateFrame.current = null;
      }
    };
  }, [types.length, updateScrollState]);

  // Auto-scroll active pill to center on mobile
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active='true']") as HTMLElement | null;
    if (!active) return;
    const offset = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
    window.setTimeout(updateScrollState, 260);
  }, [currentType, category, updateScrollState]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;
    if (container.scrollWidth <= container.clientWidth) return;

    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    container.scrollLeft += delta;
    updateScrollState();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const container = scrollRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;

    dragState.current = {
      active: true,
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
    };
    suppressClickRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    const state = dragState.current;
    if (!container || !state.active || state.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    if (!state.dragging) {
      const movedFarEnough = Math.abs(deltaX) > 14;
      const isHorizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.35;
      if (!movedFarEnough || !isHorizontalIntent) return;

      state.dragging = true;
      suppressClickRef.current = true;
      container.setPointerCapture?.(event.pointerId);
    }

    event.preventDefault();
    container.scrollLeft = state.scrollLeft - deltaX;
    updateScrollState();
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    const wasDragging = dragState.current.dragging;

    if (container && wasDragging && dragState.current.pointerId === event.pointerId) {
      container.releasePointerCapture?.(event.pointerId);
    }

    dragState.current = {
      active: false,
      dragging: false,
      pointerId: -1,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
    };

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, wasDragging ? 100 : 0);
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="catalog-type-sticky sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-40 -mx-4 mb-6 border-b border-border/55 bg-background/84 px-4 pb-2 pt-1.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:-mx-0 lg:bg-transparent lg:px-0 lg:pb-3 lg:pt-2 lg:backdrop-blur-none">
      <div
        className="catalog-type-rail-wrap relative"
        data-can-scroll-left={canScrollLeft || undefined}
        data-can-scroll-right={canScrollRight || undefined}
      >
        <div
          ref={scrollRef}
          className="catalog-type-rail flex select-none items-center gap-2 overflow-x-auto scrollbar-none"
          onClickCapture={handleClickCapture}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
          onPointerLeave={finishPointerDrag}
          onWheel={handleWheel}
          onDragStart={(event) => event.preventDefault()}
        >
        {category && (
          <Link
            prefetch
            href="/catalog"
            aria-label="Все категории"
            className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:bg-accent hover:text-foreground"
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
    </div>
  );
}
