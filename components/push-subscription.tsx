"use client";

import { useEffect } from "react";

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
  if (!key || !auth) return;
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: bufferToBase64(key), auth: bufferToBase64(auth) },
    }),
  }).catch(() => {});
}

export function PushSubscription() {
  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    navigator.serviceWorker.ready.then(async (reg) => {
      // Если уже есть подписка — обновим в БД и выйдем
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        saveSub(existing);
        return;
      }

      // Если разрешение уже дано — подпишем сразу
      if (Notification.permission === "granted") {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        saveSub(sub);
      }
      // Если permission === "default" — не спрашиваем сами,
      // ждём пока пользователь нажмёт "Разрешить уведомления" в PWA баннере
    });
  }, []);

  return null;
}

// Экспортируем функцию для вызова из PWA-баннера при явном запросе
export async function requestPushPermission(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!vapidKey) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  await saveSub(sub);
  return true;
}
