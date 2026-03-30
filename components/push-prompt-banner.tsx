"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

// Инлайн-версия чтобы не тянуть push-subscription.tsx (там useSession → сложный module graph)
async function enablePushNotifications(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!vapidKey) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const reg = await Promise.race<ServiceWorkerRegistration>([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]);
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8(vapidKey) as unknown as BufferSource,
    });
    const key = sub.getKey("p256dh");
    const auth = sub.getKey("auth");
    if (!key || !auth) return false;
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: buf2b64(key), auth: buf2b64(auth) } }),
    });
    return true;
  } catch {
    return false;
  }
}

function urlB64ToUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(b)].map((c) => c.charCodeAt(0)));
}

function buf2b64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

const STORAGE_KEY = "push_prompt_dismissed_at";
const REMIND_AFTER_DAYS = 7;

export function PushPromptBanner() {
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    if (!process.env.NEXT_PUBLIC_VAPID_KEY) return;

    // Проверяем — не отклонял ли пользователь недавно
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const daysSince = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < REMIND_AFTER_DAYS) return;
    }

    // Показываем с задержкой 8s чтобы не мешать первому взаимодействию
    const timer = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShow(false);
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const ok = await enablePushNotifications();
      if (ok) {
        setDone(true);
        setTimeout(() => setShow(false), 2000);
      } else {
        // Если пользователь отклонил — не показываем снова 7 дней
        dismiss();
      }
    } catch {
      dismiss();
    } finally {
      setSubscribing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-[360px] z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/15 p-4">
        {done ? (
          <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Уведомления включены!
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug">Включите уведомления</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Узнавайте о статусе заказов и акциях первыми
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {subscribing ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                Включить
              </button>
              <button
                onClick={dismiss}
                className="py-2 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Не сейчас
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
