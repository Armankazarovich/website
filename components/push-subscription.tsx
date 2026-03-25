"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64url);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function saveSub(sub: PushSubscription) {
  const key = sub.getKey("p256dh");
  const auth = sub.getKey("auth");
  if (!key || !auth) {
    console.error("[Push] subscription missing encryption keys");
    return;
  }
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: { p256dh: bufferToBase64(key), auth: bufferToBase64(auth) },
      }),
    });
    if (!res.ok) {
      console.error("[Push] save subscription failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Push] save subscription error:", err);
  }
}

export function PushSubscription() {
  const { data: session } = useSession();

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    async function init() {
      // Залогиненный пользователь = подписчик по умолчанию:
      // если разрешение ещё не запрашивалось — автоматически спрашиваем через 3s
      if (session?.user?.id && Notification.permission === "default") {
        await new Promise((r) => setTimeout(r, 3000));
        await Notification.requestPermission();
      }

      if (Notification.permission === "denied") return;

      const reg = await navigator.serviceWorker.ready;

      // Если уже есть подписка — обновим в БД (привяжем userId если залогинен)
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        saveSub(existing);
        return;
      }

      // Если разрешение дано — подпишем
      if (Notification.permission === "granted") {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!),
        });
        saveSub(sub);
      }
      // Гости с permission === "default" подписываются через PWA баннер
    }

    init();
  }, [session?.user?.id]); // перезапуск при логине/логауте

  return null;
}

// Экспортируем функцию для вызова из PWA-баннера при явном запросе
export async function requestPushPermission(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!vapidKey) { console.error("[Push] NEXT_PUBLIC_VAPID_KEY not set"); return false; }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // Сначала убедимся что SW зарегистрирован
  let reg: ServiceWorkerRegistration;
  try {
    // Попробуем получить существующий, или зарегистрировать новый
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) {
      reg = existing;
    } else {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await new Promise<void>((resolve) => {
        if (reg.active) { resolve(); return; }
        const handler = () => { if (reg.active) { resolve(); reg.removeEventListener("updatefound", handler); } };
        reg.addEventListener("updatefound", handler);
        // Fallback через 3s
        setTimeout(resolve, 3000);
      });
    }

    // Ждём активации SW максимум 10s
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SW not ready after 10s")), 10000)
      ),
    ]);
  } catch (err) {
    console.error("[Push] Service worker registration failed:", err);
    return false;
  }

  try {
    // Если подписка уже есть — обновим и вернём успех
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await saveSub(existing);
      return true;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    await saveSub(sub);
    return true;
  } catch (err) {
    console.error("[Push] pushManager.subscribe error:", err);
    return false;
  }
}
