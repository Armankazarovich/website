"use client";

/**
 * AdminPageHeader — sticky header для разделов админки в новом calm UI.
 *
 * День 2 (27.04.2026): каркас. Search-инпут без логики (placeholder уровня 1
 * "Поиск по разделу или дай команду Араю"). На след. сессиях:
 *   1) Постгрес FTS по товарам/заказам/клиентам — мгновенно, без LLM.
 *   2) Если ничего не нашли — пробрасываем строку Араю (Haiku) как контекст.
 */

import { Search, ChevronLeft, Sparkles } from "lucide-react";

type Props = {
  /** Заголовок раздела (например "Дом Арая"). */
  title: string;
  /** Подзаголовок — короткая строка под заголовком. */
  subtitle?: string;
  /** Включить ли search-инпут (по умолчанию true). */
  showSearch?: boolean;
  /** Placeholder поиска. */
  searchPlaceholder?: string;
  /** Скрыть кнопку свернуть Aray (если на странице нет pinned-rail). */
  hideArayToggle?: boolean;
};

export function AdminPageHeader({
  title,
  subtitle,
  showSearch = true,
  searchPlaceholder = "Поиск по разделу или дай команду Араю",
  hideArayToggle = false,
}: Props) {
  const toggleAray = () => {
    window.dispatchEvent(new CustomEvent("aray:rail:toggle"));
  };

  return (
    <header className="sticky top-0 z-20 -mx-2.5 lg:-mx-6 px-2.5 lg:px-6 py-3 mb-4 bg-background/80 backdrop-blur-md border-b border-border">
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

        {showSearch && (
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder={searchPlaceholder}
                disabled
                title="Гиперумный поиск — следующая сессия (3 уровня: Postgres FTS → Haiku → Sonnet)"
                style={{ fontSize: 14 }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40 focus:bg-muted/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {!hideArayToggle && (
          <button
            onClick={toggleAray}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 text-foreground transition-colors text-xs font-medium"
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
