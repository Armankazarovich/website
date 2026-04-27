"use client";

/**
 * AdminPageHeader — sticky header для разделов админки.
 *
 * Сессия 38 (27.04.2026): Заход A полировки Дома Арая. Убрано:
 *  - backdrop-filter blur (нарушение DESIGN_SYSTEM п.1.7 — стекло на постоянных
 *    элементах)
 *  - disabled-поиск с tooltip «скоро» (магазин имеет рабочий мгновенный поиск,
 *    нет фичи — нет UI). Настоящий поиск с slide-навигацией — Заход B.
 *
 * Добавлено:
 *  - slot extraActions для кнопок справа (шестерёнка настроек, кастомные действия)
 *  - кнопка свернуть/развернуть Aray pinned-rail (как было)
 */

import { ChevronLeft, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  /** Кастомные кнопки справа (например AraySettingsTrigger). */
  extraActions?: ReactNode;
  /** Скрыть кнопку свернуть Aray (если на странице нет pinned-rail). */
  hideArayToggle?: boolean;
};

export function AdminPageHeader({
  title,
  subtitle,
  extraActions,
  hideArayToggle = false,
}: Props) {
  const toggleAray = () => {
    window.dispatchEvent(new CustomEvent("aray:rail:toggle"));
  };

  return (
    <header className="sticky top-0 z-20 -mx-2.5 lg:-mx-6 px-2.5 lg:px-6 py-3 mb-4 bg-background border-b border-border">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg lg:text-xl font-semibold text-foreground leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-tight truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {extraActions && (
          <div className="flex items-center gap-2 shrink-0">
            {extraActions}
          </div>
        )}

        {!hideArayToggle && (
          <button
            onClick={toggleAray}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 text-foreground transition-colors text-xs font-medium shrink-0"
            aria-label="Свернуть/развернуть Арая"
            title="Свернуть/развернуть Арая"
            type="button"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="hidden xl:inline">Арай</span>
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </header>
  );
}
