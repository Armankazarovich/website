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
}: {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
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
      <div className="arayglass arayglass-glow flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-foreground shadow-lg max-w-[90vw]">
        <Check className="w-4 h-4 text-primary shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
