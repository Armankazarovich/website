"use client";

import { useEffect } from "react";

const LOCAL_SW_RESET_KEY = "aray-local-sw-disabled-v1";
const PASSIVE_SW_CACHE_RESET_KEY = "aray-pilorus-passive-sw-cache-reset-20260627";

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

function postCacheClearMessage(worker: ServiceWorker | null | undefined) {
  if (!worker) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(false), 900);
    channel.port1.onmessage = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };

    try {
      worker.postMessage({ type: "CLEAR_ARAY_CACHES", includeAllOriginCaches: false }, [channel.port2]);
    } catch {
      window.clearTimeout(timeout);
      resolve(false);
    }
  });
}

async function clearOldRuntimeCachesOnce(registration: ServiceWorkerRegistration) {
  try {
    if (window.localStorage.getItem(PASSIVE_SW_CACHE_RESET_KEY) === "done") return;
  } catch {}

  try {
    const worker = registration.active || registration.waiting || registration.installing || navigator.serviceWorker.controller;
    await postCacheClearMessage(worker);
  } catch {}

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("aray-") || key.startsWith("workbox-"))
          .map((key) => window.caches.delete(key))
      );
    }
  } catch {}

  try {
    window.localStorage.setItem(PASSIVE_SW_CACHE_RESET_KEY, "done");
  } catch {}
}

async function registerPassiveServiceWorker() {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  reg.update().catch(() => {});

  navigator.serviceWorker.ready
    .then((readyReg) => clearOldRuntimeCachesOnce(readyReg))
    .catch(() => clearOldRuntimeCachesOnce(reg));

  reg.addEventListener("updatefound", () => {
    const newWorker = reg.installing;
    if (!newWorker) return;
    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        newWorker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  });
}

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (isLocalDevHost()) {
      void disableLocalServiceWorkerCache();
      return;
    }

    // Чуть откладываем — не мешаем первому экрану и кликам.
    const timer = setTimeout(async () => {
      try {
        await registerPassiveServiceWorker();
      } catch {
        // Тихо — dev-режим, HTTP, блокировщики и т.д.
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return null;
}
