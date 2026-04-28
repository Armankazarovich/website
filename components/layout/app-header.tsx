"use client";

/**
 * AppHeader — единый стеклянный sticky-хедер ПилоРус.
 *
 * Сессия 39 (28.04.2026): админка переезжает на дизайн-систему магазина.
 * Армана видение: «хедер как пилорус, стеклянный с тонкой голубой полоской
 * снизу. В магазине — логотип, в админке — название раздела + умный поиск +
 * меню. Один визуальный язык на всём проекте».
 *
 * Этот компонент содержит ТОЛЬКО визуальную оболочку (стекло + полоска
 * + sticky behavior + container). Содержимое передаётся через слоты
 * leftSlot / centerSlot / rightSlot, чтобы магазин и админка использовали
 * один компонент с разным контентом.
 *
 * Токены взяты 1-в-1 из components/layout/header.tsx (магазин):
 * - backdrop-filter: blur(32px) saturate(200%)
 * - background: hsl(var(--background) / 0.78) → 0.94 при scroll
 * - border-bottom: 1px solid hsl(var(--primary) / 0.12) → 0.28 при scroll
 * - box-shadow при scroll: 0 8px 40px hsl(var(--foreground) / 0.08)
 * - Тонкая голубая полоска снизу: linear-gradient через primary
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  leftSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Высота хедера в px (по дефолту 64 — как магазин) */
  height?: number;
  /** Доп. CSS классы для контейнера-container внутри */
  containerClassName?: string;
  /** Если true — хедер не sticky, обычный flow (для модалок) */
  noSticky?: boolean;
}

export function AppHeader({
  leftSlot,
  centerSlot,
  rightSlot,
  height = 64,
  containerClassName,
  noSticky = false,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Сначала проверяем текущую позицию скролла (если страница загружена с прокруткой)
    setScrolled(window.scrollY > 20);
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Стиль до mount = базовый (никаких scroll-зависимых вариаций) ──
  // Это убирает SSR mismatch и мерцание: сервер и клиент рендерят
  // одинаковое до первого useEffect.
  const isScrolled = mounted && scrolled;

  return (
    <header
      className={cn(
        noSticky ? "relative" : "sticky top-0 z-50",
        // Transition включаем только после mount — иначе видно как стиль
        // плавно "проявляется" в первые 500ms
        mounted ? "transition-[background,border-color,box-shadow] duration-300" : ""
      )}
      style={{
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        background: isScrolled
          ? "hsl(var(--background) / 0.94)"
          : "hsl(var(--background) / 0.78)",
        borderBottom: `1px solid hsl(var(--primary) / ${
          isScrolled ? "0.28" : "0.12"
        })`,
        boxShadow: isScrolled
          ? "0 8px 40px hsl(var(--foreground) / 0.08), 0 1px 0 hsl(var(--primary) / 0.15)"
          : "none",
      }}
    >
      {/* Тонкая голубая полоска снизу (palette-aware) */}
      <div
        className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.5) 30%, hsl(var(--primary)/0.8) 50%, hsl(var(--primary)/0.5) 70%, transparent 100%)",
        }}
      />

      <div
        className={cn(
          "container flex items-center gap-3",
          containerClassName,
        )}
        style={{ height }}
      >
        {leftSlot && <div className="flex items-center gap-2 shrink-0">{leftSlot}</div>}
        {centerSlot && <div className="flex-1 min-w-0 flex items-center justify-center">{centerSlot}</div>}
        {rightSlot && <div className="flex items-center gap-2 shrink-0 ml-auto">{rightSlot}</div>}
      </div>
    </header>
  );
}
