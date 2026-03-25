"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Невидимый компонент — автоматически обновляет страницу каждые N секунд.
 * Встраивается в серверные компоненты чтобы данные всегда были актуальными.
 */
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
