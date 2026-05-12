"use client";

type ClearCacheOptions = {
  includeAllOriginCaches?: boolean;
};

export type ClearCacheResult = {
  deletedCaches: string[];
  registrationsUpdated: number;
  serviceWorkerCleared: boolean;
};

const APP_CACHE_PREFIXES = ["aray-", "workbox-"];

function shouldDeleteCacheKey(key: string, includeAllOriginCaches: boolean) {
  if (includeAllOriginCaches) return true;
  return APP_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function postServiceWorkerMessage(worker: ServiceWorker, message: Record<string, unknown>) {
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(false), 1200);
    channel.port1.onmessage = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };
    try {
      worker.postMessage(message, [channel.port2]);
    } catch {
      window.clearTimeout(timeout);
      resolve(false);
    }
  });
}

export async function clearArayClientCaches(options: ClearCacheOptions = {}): Promise<ClearCacheResult> {
  if (typeof window === "undefined") {
    return { deletedCaches: [], registrationsUpdated: 0, serviceWorkerCleared: false };
  }

  const includeAllOriginCaches = options.includeAllOriginCaches ?? true;
  const deletedCaches: string[] = [];
  let registrationsUpdated = 0;
  let serviceWorkerCleared = false;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    for (const registration of registrations) {
      await registration.update().catch(() => {});
      registrationsUpdated += 1;

      const worker = registration.active || registration.waiting || registration.installing;
      if (worker) {
        const cleared = await postServiceWorkerMessage(worker, {
          type: "CLEAR_ARAY_CACHES",
          includeAllOriginCaches,
        });
        serviceWorkerCleared = serviceWorkerCleared || cleared;
      }

      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    }
  }

  if ("caches" in window) {
    const keys = await window.caches.keys().catch(() => []);
    const keysToDelete = keys.filter((key) => shouldDeleteCacheKey(key, includeAllOriginCaches));
    await Promise.all(
      keysToDelete.map(async (key) => {
        const deleted = await window.caches.delete(key).catch(() => false);
        if (deleted) deletedCaches.push(key);
      })
    );
  }

  return { deletedCaches, registrationsUpdated, serviceWorkerCleared };
}
