"use client";

import { useEffect } from "react";

const LOCAL_SW_RESET_KEY = "aray-local-sw-disabled-v1";
const BACKGROUND_REFRESH_TAG = "aray-background-refresh";
const SW_CONTROLLER_RELOAD_KEY = "aray-sw-controller-reload-v2";

type SyncRegistration = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
};

function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  return (
    process.env.NODE_ENV !== "production" ||
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  );
}

// Регистрация Service Worker — кэширование, PWA, push-уведомления
async function disableLocalServiceWorkerCache() {
  let changed = false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        const removed = await registration.unregister().catch(() => false);
        changed = changed || removed;
      })
    );
  } catch {}

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      const appKeys = keys.filter((key) => key.startsWith("aray-"));
      await Promise.all(appKeys.map((key) => window.caches.delete(key)));
      changed = changed || appKeys.length > 0;
    }
  } catch {}

  try {
    if ((changed || navigator.serviceWorker.controller) && !window.sessionStorage.getItem(LOCAL_SW_RESET_KEY)) {
      window.sessionStorage.setItem(LOCAL_SW_RESET_KEY, "1");
      window.location.reload();
    }
  } catch {}
}

function currentWarmUrls() {
  if (typeof window === "undefined") return [];
  return [
    `${window.location.pathname}${window.location.search}`,
    "/",
    "/catalog",
    "/cart",
    "/compare",
    "/wishlist",
  ];
}

function postWarmRoutesMessage(registration: ServiceWorkerRegistration) {
  const worker = registration.active || navigator.serviceWorker.controller;
  if (!worker) return;

  try {
    const channel = new MessageChannel();
    worker.postMessage({ type: "WARM_ARAY_ROUTES", urls: currentWarmUrls() }, [channel.port2]);
  } catch {}
}

async function warmArayRoutes(registration: ServiceWorkerRegistration) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  try {
    await (registration as SyncRegistration).sync?.register(BACKGROUND_REFRESH_TAG);
  } catch {}

  postWarmRoutesMessage(registration);
}

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (isLocalDevHost()) {
      void disableLocalServiceWorkerCache();
      return;
    }

    let removeRefreshListeners: (() => void) | null = null;

    // Чуть откладываем — не блокируем первый рендер
    const timer = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Проверяем обновление при каждом открытии
        reg.update().catch(() => {});
        warmArayRoutes(reg).catch(() => {});

        const refreshRoutes = () => {
          navigator.serviceWorker.ready
            .then((readyReg) => {
              readyReg.update().catch(() => {});
              return warmArayRoutes(readyReg);
            })
            .catch(() => {});
        };

        const refreshWhenVisible = () => {
          if (document.visibilityState === "visible") refreshRoutes();
        };

        window.addEventListener("online", refreshRoutes);
        document.addEventListener("visibilitychange", refreshWhenVisible);
        removeRefreshListeners = () => {
          window.removeEventListener("online", refreshRoutes);
          document.removeEventListener("visibilitychange", refreshWhenVisible);
        };

        const reloadAfterControllerChange = () => {
          refreshRoutes();

          try {
            if (!window.sessionStorage.getItem(SW_CONTROLLER_RELOAD_KEY)) {
              window.sessionStorage.setItem(SW_CONTROLLER_RELOAD_KEY, "1");
              window.setTimeout(() => {
                window.location.reload();
              }, 350);
            }
          } catch {}
        };

        navigator.serviceWorker.addEventListener("controllerchange", reloadAfterControllerChange);
        const previousRemove = removeRefreshListeners;
        removeRefreshListeners = () => {
          previousRemove?.();
          navigator.serviceWorker.removeEventListener("controllerchange", reloadAfterControllerChange);
        };

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

    return () => {
      clearTimeout(timer);
      removeRefreshListeners?.();
    };
  }, []);

  return null;
}
