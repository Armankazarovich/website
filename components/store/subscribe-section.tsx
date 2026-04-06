"use client";

import { useState, useEffect } from "react";
import { Mail, Bell, Send, Check, ChevronRight, X } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  || "BAihV9lCMxJIUC0bZMnvg-CsshjQflfZ9DlWIDutvu29OPZFYh0DQMUb59MV7d0xdeijH-MrL02-BTjyNYy2wX4";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function SubscribeSection() {
  const [email, setEmail]           = useState("");
  const [emailDone, setEmailDone]   = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [pushSupported, setPushSupported] = useState(false);
  const [pushGranted, setPushGranted]     = useState(false);
  const [pushLoading, setPushLoading]     = useState(false);

  const [tgCopied, setTgCopied] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);
    if (supported && Notification.permission === "granted") {
      setPushGranted(true);
    }
  }, []);

  /* ── Email подписка ── */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailLoading(true);
    setEmailError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "subscribe_section" }),
      });
      if (res.ok) {
        setEmailDone(true);
      } else {
        const j = await res.json().catch(() => ({}));
        setEmailError(j.error || "Ошибка. Попробуйте ещё раз.");
      }
    } catch {
      setEmailError("Нет соединения. Попробуйте позже.");
    } finally {
      setEmailLoading(false);
    }
  }

  /* ── Push подписка ── */
  async function handlePush() {
    if (!pushSupported || pushGranted) return;
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setPushLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
            auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
          },
        }),
      });
      setPushGranted(true);
    } catch {
      // silently fail
    } finally {
      setPushLoading(false);
    }
  }

  /* ── Telegram кнопка ── */
  function handleTelegram() {
    window.open("https://t.me/pilorus_orders_bot?start=subscribe", "_blank");
    setTgCopied(true);
    setTimeout(() => setTgCopied(false), 3000);
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Будьте в курсе</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">
            Акции, новинки и советы
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Подпишитесь удобным способом — получайте скидки первыми и узнавайте о новых поступлениях пиломатериалов
          </p>
        </div>

        {/* Three cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">

          {/* ── Email card ── */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-base mb-1">Email рассылка</h3>
            <p className="text-sm text-muted-foreground mb-5 flex-1">
              Акции, новости и советы по работе с деревом — раз в 2 недели
            </p>

            {emailDone ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Подписка оформлена!
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ваш@email.ru"
                  required
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {emailError && (
                  <p className="text-xs text-red-500">{emailError}</p>
                )}
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {emailLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Подписаться
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* ── Push card ── */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
              <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-bold text-base mb-1">Push-уведомления</h3>
            <p className="text-sm text-muted-foreground mb-5 flex-1">
              Мгновенные уведомления прямо в браузере — статусы заказов и горячие акции
            </p>

            {pushGranted ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Уведомления включены!
                </p>
              </div>
            ) : !pushSupported ? (
              <div className="p-3 bg-muted/60 rounded-xl">
                <p className="text-xs text-muted-foreground">
                  Ваш браузер не поддерживает push-уведомления
                </p>
              </div>
            ) : (
              <button
                onClick={handlePush}
                disabled={pushLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {pushLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Включить уведомления
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── Telegram card — скрыт ── */}
          <div className="hidden bg-card border border-border rounded-2xl p-6 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-4">
              <Send className="w-5 h-5 text-sky-500" />
            </div>
            <h3 className="font-bold text-base mb-1">Telegram канал</h3>
            <p className="text-sm text-muted-foreground mb-5 flex-1">
              Акции, фотографии со склада, советы по выбору дерева — живой канал команды
            </p>

            {tgCopied ? (
              <div className="flex items-center gap-2 p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40 rounded-xl">
                <Check className="w-4 h-4 text-sky-600 shrink-0" />
                <p className="text-sm font-medium text-sky-700 dark:text-sky-400">
                  Открываем Telegram…
                </p>
              </div>
            ) : (
              <button
                onClick={handleTelegram}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Send className="w-4 h-4" />
                Подписаться в Telegram
              </button>
            )}

            <p className="text-[11px] text-muted-foreground text-center mt-3">
              @pilorus_orders_bot
            </p>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Без спама. Отписаться можно в любой момент.
        </p>
      </div>
    </section>
  );
}
