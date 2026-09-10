"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

/**
 * Лёгкий floating-pill для положительного фидбека админских действий
 * (сортировка размеров, авто-расчёт шт/м³, дублирование, и т.п.).
 * Автоскрытие через `durationMs` (по умолчанию 2 сек).
 *
 * Назван `ActionToast` чтобы не конфликтовать с базовым shadcn `Toast`.
 * Использует существующие классы `.arayglass` и `.arayglass-glow` из
 * `globals.css` — никаких новых CSS.
 */
export function ActionToast({
  message,
  onDismiss,
  durationMs = 2000,
  action,
}: {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
  /** Необязательная кнопка в строке — например «Вернуть» для обратимого действия. */
  action?: { label: string; onClick: () => void } | null;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-28 z-[60] pointer-events-none animate-in fade-in slide-in-from-bottom-2"
    >
      <div className={`arayglass flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-foreground max-w-[90vw]${action ? " pointer-events-auto" : ""}`}>
        <Check className="w-4 h-4 text-primary shrink-0" />
        <span>{message}</span>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className="-my-1 ml-1 min-h-11 shrink-0 rounded-xl px-3 font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
