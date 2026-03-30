"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle, XCircle, Loader2, ShieldAlert, Smartphone } from "lucide-react";
import { requestPushPermission } from "@/components/push-subscription";

type PermState = "default" | "granted" | "denied" | "unsupported" | "loading";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(b)].map((c) => c.charCodeAt(0)));
}

export default function CabinetNotificationsPage() {
  const [perm, setPerm] = useState<PermState>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission as PermState);
    // Проверяем активную подписку
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    );
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = await requestPushPermission();
      if (ok) {
        setPerm("granted");
        setSubscribed(true);
        setMsg({ type: "ok", text: "Уведомления включены! Вы будете получать информацию о заказах и акциях." });
      } else {
        setPerm(Notification.permission as PermState);
        setMsg({ type: "err", text: "Не удалось включить уведомления. Проверьте настройки браузера." });
      }
    } catch {
      setMsg({ type: "err", text: "Ошибка при активации уведомлений." });
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setSubscribed(false);
      setMsg({ type: "ok", text: "Уведомления отключены." });
    } catch {
      setMsg({ type: "err", text: "Ошибка при отключении уведомлений." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Уведомления</h1>
        <p className="text-muted-foreground text-sm">Управление push-уведомлениями на этом устройстве</p>
      </div>

      {/* Статус */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Статус уведомлений
        </h2>

        {perm === "loading" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Проверка...
          </div>
        )}

        {perm === "unsupported" && (
          <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl">
            <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Браузер не поддерживает push-уведомления</p>
              <p className="text-sm text-muted-foreground mt-1">
                Попробуйте открыть сайт в Chrome, Firefox или Safari на iOS 16.4+.
              </p>
            </div>
          </div>
        )}

        {perm === "denied" && (
          <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
            <ShieldAlert className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-destructive">Уведомления заблокированы в браузере</p>
              <p className="text-sm text-muted-foreground mt-1">
                Вы ранее отклонили запрос. Чтобы включить обратно:
              </p>
              <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>Нажмите на замок <strong>🔒</strong> слева от адресной строки</li>
                <li>Найдите пункт <strong>«Уведомления»</strong></li>
                <li>Выберите <strong>«Разрешить»</strong></li>
                <li>Обновите страницу и нажмите «Включить уведомления»</li>
              </ol>
            </div>
          </div>
        )}

        {(perm === "default" || perm === "granted") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-sm">Push-уведомления</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subscribed && perm === "granted"
                    ? "Активны на этом устройстве"
                    : "Не подключены"}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                subscribed && perm === "granted"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  subscribed && perm === "granted" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                }`} />
                {subscribed && perm === "granted" ? "Включены" : "Выключены"}
              </div>
            </div>

            {subscribed && perm === "granted" ? (
              <button
                onClick={handleUnsubscribe}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
                Отключить уведомления
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                Включить уведомления
              </button>
            )}
          </div>
        )}

        {msg && (
          <div className={`flex items-start gap-2 text-sm ${msg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            {msg.type === "ok"
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            }
            {msg.text}
          </div>
        )}
      </div>

      {/* Что вы будете получать */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-3">Что включено в уведомления</h2>
        <div className="space-y-3">
          {[
            { icon: "🛒", title: "Подтверждение заказа", desc: "Сразу после оформления" },
            { icon: "📦", title: "Статус доставки", desc: "Обработка, в пути, доставлен" },
            { icon: "🏷️", title: "Акции и скидки", desc: "Специальные предложения для вас" },
            { icon: "🔔", title: "Важные новости", desc: "Новые товары, изменения цен" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-lg shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
