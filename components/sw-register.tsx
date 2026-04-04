"use client";

import { useEffect } from "react";

// Регистрация Service Worker — кэширование, PWA, push-уведомления
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Чуть откладываем — не блокируем первый рендер
    const timer = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Проверяем обновление при каждом открытии
        reg.update().catch(() => {});

        // Если нашёлся новый SW — активируем сразу
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // НЕ делаем reload при controllerchange — это вызывает мерцание.
        // Новый SW уже взял управление (SKIP_WAITING выше).
        // HTML страницы используют NetworkFirst стратегию → всегда свежие.
        // Следующий переход/открытие уже через новый SW.
      } catch {
        // Тихо — dev-режим, HTTP, блокировщики и т.д.
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
