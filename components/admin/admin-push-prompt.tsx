"use client";

import { useEffect, useState } from "react";
import { Bell, X, CheckCircle } from "lucide-react";
import { requestPushPermission } from "@/components/push-subscription";

const STORAGE_KEY = "admin_push_prompt_dismissed_at";

export function AdminPushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") return;
    if (!process.env.NEXT_PUBLIC_VAPID_KEY) return;

    // Для denied — показываем всегда (нужно напомнить что надо включить)
    if (Notification.permission === "denied") {
      const d = localStorage.getItem(STORAGE_KEY);
      if (!d || (Date.now() - Number(d)) > 3 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShow(true), 3000);
      }
      return;
    }

    // Для default — показываем через 3s
    const d = localStorage.getItem(STORAGE_KEY);
    if (d && (Date.now() - Number(d)) < 24 * 60 * 60 * 1000) return;
    setTimeout(() => setShow(true), 3000);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShow(false);
  };

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      const ok = await requestPushPermission();
      if (ok) {
        setDone(true);
        setTimeout(() => setShow(false), 2500);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  const isDenied = typeof window !== "undefined" && Notification.permission === "denied";

  return (
    <div className="mx-3 mb-2 bg-white/10 border border-white/15 rounded-xl p-3 relative">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>

      {done ? (
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle className="w-3.5 h-3.5" />
          Уведомления включены!
        </div>
      ) : isDenied ? (
        <div className="pr-5">
          <p className="text-xs font-semibold text-orange-300 mb-1">⚠️ Push заблокированы</p>
          <p className="text-[10px] text-white/60 leading-relaxed">
            Разрешите уведомления в настройках браузера (замок в адресной строке), чтобы получать новые заказы
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2 pr-5">
            <Bell className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <p className="text-xs font-medium text-white">Включите push-уведомления</p>
          </div>
          <p className="text-[10px] text-white/60 mb-2.5 leading-relaxed">
            Получайте уведомления о новых заказах прямо в браузере
          </p>
          <button
            onClick={handleSubscribe}
            disabled={busy}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white text-brand-brown text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            {busy ? (
              <span className="w-3 h-3 border-2 border-brand-brown/30 border-t-brand-brown rounded-full animate-spin" />
            ) : (
              <Bell className="w-3 h-3" />
            )}
            Подключить
          </button>
        </>
      )}
    </div>
  );
}
