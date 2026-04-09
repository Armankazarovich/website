"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Send, Loader2, CheckCircle, XCircle, Users, UserCheck, UserX, Clock, ShoppingBag, Activity, Trash2, Bot, Wifi, WifiOff, RefreshCw, AlertTriangle, Package, Lightbulb, Megaphone } from "lucide-react";
import { InfoBadge } from "@/components/admin/info-popup";
import { requestPushPermission } from "@/components/push-subscription";

const SEGMENTS = [
  { key: "all", label: "Все подписчики", icon: Bell },
  { key: "registered", label: "Зарегистрированные", icon: UserCheck },
  { key: "guests", label: "Гости", icon: UserX },
  { key: "inactive", label: "Давно не заказывали (30+ дней)", icon: Clock },
  { key: "no-orders", label: "Никогда не заказывали", icon: ShoppingBag },
];

type Sub = {
  id: string;
  createdAt: string;
  isRegistered: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  lastOrderAt: string | null;
  ordersCount: number;
};

export default function NotificationsPage() {
  const [tab, setTab] = useState<"send" | "subscribers">("send");
  const [form, setForm] = useState({ title: "", body: "", url: "" });
  const [segment, setSegment] = useState("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  const [subs, setSubs] = useState<Sub[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsFilter, setSubsFilter] = useState<"all" | "registered" | "guests">("all");

  type DebugInfo = {
    count: number;
    withUser: number;
    guests: number;
    vapidConfigured: boolean;
    publicKeyPrefix: string;
    nextPublicKeySet: boolean;
    browserPermission?: string;
    swActive?: boolean;
    browserSubActive?: boolean;
  };
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeResult, setSubscribeResult] = useState<"ok" | "err" | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  // ── Telegram webhook state ───────────────────────────────────────────────
  type TgStatus = {
    configured: boolean; correct?: boolean; webhookUrl?: string; expectedUrl?: string;
    pendingUpdateCount?: number; lastErrorDate?: string | null; lastErrorMessage?: string | null;
    error?: string;
  };
  const [tgStatus, setTgStatus] = useState<TgStatus | null>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgSetting, setTgSetting] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgResult, setTgResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

  const checkTelegram = async () => {
    setTgLoading(true);
    setTgResult(null);
    const res = await fetch("/api/admin/notifications/telegram-setup");
    const data = await res.json();
    setTgStatus(data);
    setTgLoading(false);
  };

  const setupTelegram = async () => {
    setTgSetting(true);
    setTgResult(null);
    const res = await fetch("/api/admin/notifications/telegram-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
    });
    const data = await res.json();
    setTgResult(data);
    setTgSetting(false);
    if (data.ok) checkTelegram();
  };

  const testTelegram = async () => {
    setTgTesting(true);
    setTgResult(null);
    const res = await fetch("/api/admin/notifications/telegram-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    });
    const data = await res.json();
    setTgResult(data);
    setTgTesting(false);
  };

  const checkDebug = async () => {
    setDebugLoading(true);
    try {
      const res = await fetch("/api/push/debug");
      const data = await res.json();
      const browserPermission = typeof Notification !== "undefined" ? Notification.permission : "unknown";
      let swActive = false;
      let browserSubActive = false;
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/");
        if (reg) {
          swActive = true;
          const sub = await reg.pushManager.getSubscription();
          browserSubActive = !!sub;
        }
      }
      setDebug({ ...data, browserPermission, swActive, browserSubActive });
    } finally {
      setDebugLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    setSubscribeResult(null);
    try {
      const ok = await requestPushPermission();
      setSubscribeResult(ok ? "ok" : "err");
      if (ok) setTimeout(() => checkDebug(), 1500);
    } catch {
      setSubscribeResult("err");
    } finally {
      setSubscribing(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    setCleanResult(null);
    try {
      const res = await fetch("/api/push/cleanup", { method: "POST" });
      const data = await res.json();
      setCleanResult(data.message || "Готово");
      // Обновить список подписчиков
      setSubs([]);
      if (tab === "subscribers") {
        setSubsLoading(true);
        fetch("/api/push/subscribers")
          .then((r) => r.json())
          .then((d) => { if (Array.isArray(d)) setSubs(d); })
          .finally(() => setSubsLoading(false));
      }
      if (debug) setTimeout(() => checkDebug(), 500);
    } catch {
      setCleanResult("Ошибка очистки");
    } finally {
      setCleaning(false);
    }
  };

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!form.title || !form.body) { setError("Заполните заголовок и текст"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, segment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setResult(data);
      setForm({ title: "", body: "", url: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "subscribers" && subs.length === 0) {
      setSubsLoading(true);
      fetch("/api/push/subscribers")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setSubs(data); })
        .finally(() => setSubsLoading(false));
    }
  }, [tab]);

  const filteredSubs = subs.filter((s) => {
    if (subsFilter === "registered") return s.isRegistered;
    if (subsFilter === "guests") return !s.isRegistered;
    return true;
  });

  const fmt = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">Push уведомления</h1>
          <p className="text-sm text-muted-foreground">Рассылка и база подписчиков</p>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("send")}
          className={`admin-pill-btn ${tab === "send" ? "admin-pill-btn-active" : ""}`}
        >
          Рассылка
        </button>
        <button
          onClick={() => setTab("subscribers")}
          className={`admin-pill-btn ${tab === "subscribers" ? "admin-pill-btn-active" : ""}`}
        >
          Подписчики {subs.length > 0 && <span className="ml-1 text-xs text-primary">({subs.length})</span>}
        </button>
      </div>

      {/* Таб: Рассылка */}
      {tab === "send" && (
        <div className="space-y-5">
          <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground space-y-1.5">
            <p className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 shrink-0" /> <span><strong>Авто:</strong> новый заказ → пуш сотрудникам + клиенту</span></p>
            <p className="flex items-center gap-2"><Package className="w-4 h-4 shrink-0" /> <span><strong>Авто:</strong> смена статуса → пуш клиенту</span></p>
            <p className="flex items-center gap-2"><Lightbulb className="w-4 h-4 shrink-0" /> <span><strong>Авто:</strong> советы каждый понедельник, акции по пятницам</span></p>
            <p className="flex items-center gap-2"><Megaphone className="w-4 h-4 shrink-0" /> <span><strong>Вручную:</strong> форма ниже — рассылка по сегменту</span></p>
          </div>

          {/* Диагностика */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Диагностика Push
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={checkDebug}
                  disabled={debugLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted/40 hover:bg-primary/[0.08] rounded-lg transition-colors disabled:opacity-50"
                >
                  {debugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                  Проверить
                </button>
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                >
                  {subscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                  Подписаться сейчас
                </button>
                <button
                  type="button"
                  onClick={handleCleanup}
                  disabled={cleaning}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Очистить дубли
                </button>
              </div>
            </div>
            {subscribeResult === "ok" && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Подписка активирована
              </p>
            )}
            {subscribeResult === "err" && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Ошибка подписки — проверьте консоль
              </p>
            )}
            {debug && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Подписчиков в БД</p>
                  <p className="font-bold text-base">{debug.count}</p>
                  <p className="text-muted-foreground">{debug.withUser} зарег. / {debug.guests} гостей</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                    VAPID ключи
                    <InfoBadge
                      text="VAPID — стандарт безопасности для Web Push. Пара ключей (публичный + приватный) хранится в .env на сервере. Без них push-уведомления не работают."
                      width={260}
                    />
                  </p>
                  <p className={`font-semibold flex items-center gap-1 ${debug.vapidConfigured ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {debug.vapidConfigured ? <><CheckCircle className="w-3 h-3 shrink-0" /> Настроены</> : <><XCircle className="w-3 h-3 shrink-0" /> Не настроены</>}
                  </p>
                  <p className="text-muted-foreground">{debug.publicKeyPrefix}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Браузер</p>
                  <p className={`font-semibold flex items-center gap-1 ${debug.browserPermission === "granted" ? "text-green-600 dark:text-green-400" : debug.browserPermission === "denied" ? "text-destructive" : "text-yellow-600"}`}>
                    {debug.browserPermission === "granted" ? <><CheckCircle className="w-3 h-3 shrink-0" /> Разрешено</> : debug.browserPermission === "denied" ? <><XCircle className="w-3 h-3 shrink-0" /> Заблокировано</> : <><AlertTriangle className="w-3 h-3 shrink-0" /> Не спрашивали</>}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1">
                    SW: {debug.swActive ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-destructive" />} · Подписка: {debug.browserSubActive ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-destructive" />}
                  </p>
                </div>
              </div>
            )}
            {!debug && !debugLoading && (
              <p className="text-xs text-muted-foreground">Нажмите «Проверить» чтобы увидеть статус Push системы</p>
            )}
          </div>

          <form onSubmit={handleSend} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold">Отправить уведомление</h2>

            {/* Сегмент */}
            <div>
              <Label>Получатели</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SEGMENTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSegment(s.key)}
                    className={`admin-pill-btn ${segment === s.key ? "admin-pill-btn-active" : ""}`}
                  >
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Заголовок *</Label>
              <Input
                className="mt-1"
                placeholder="Например: Акция на доски!"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Текст уведомления *</Label>
              <Input
                className="mt-1"
                placeholder="Например: Скидка 15% на обрезную доску до конца недели"
                value={form.body}
                onChange={(e) => setField("body", e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Ссылка при нажатии (необязательно)</Label>
              <Input
                className="mt-1"
                placeholder="/catalog или /promotions"
                value={form.url}
                onChange={(e) => setField("url", e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="w-4 h-4" /> {error}
              </div>
            )}
            {result && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                Отправлено: <strong>{result.sent}</strong> устройств
                {result.failed > 0 && <span className="text-muted-foreground ml-2">(ошибок: {result.failed})</span>}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Отправка...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Отправить: {SEGMENTS.find(s => s.key === segment)?.label}</>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Таб: Подписчики */}
      {tab === "subscribers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {(["all", "registered", "guests"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSubsFilter(f)}
                  className={`admin-pill-btn ${subsFilter === f ? "admin-pill-btn-active" : ""}`}
                >
                  {f === "all" ? "Все" : f === "registered" ? "Зарег." : "Гости"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              Всего: {filteredSubs.length}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {subsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Имя</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Контакт</th>
                      <th className="text-center px-4 py-3 font-semibold">Тип</th>
                      <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Заказов</th>
                      <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Посл. заказ</th>
                      <th className="text-right px-4 py-3 font-semibold">Подписался</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubs.map((s) => (
                      <tr key={s.id} className="hover:bg-primary/[0.04] transition-colors">
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                          {s.email || s.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.isRegistered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary rounded-full text-xs font-medium">
                              <UserCheck className="w-2.5 h-2.5" /> Зарег.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                              Гость
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                          {s.isRegistered ? s.ordersCount : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                          {fmt(s.lastOrderAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                          {fmt(s.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSubs.length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Нет подписчиков</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Telegram Bot Section ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Telegram Бот</h2>
              <p className="text-xs text-muted-foreground">Настройка вебхука и проверка соединения</p>
            </div>
          </div>
          <button
            onClick={checkTelegram}
            disabled={tgLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-primary/[0.08] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${tgLoading ? "animate-spin" : ""}`} />
            Проверить
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status display */}
          {tgStatus === null && !tgLoading && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
              <Bot className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Нажмите "Проверить" чтобы узнать статус вебхука</p>
            </div>
          )}

          {tgStatus && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              tgStatus.error ? "bg-destructive/5 border-destructive/20" :
              tgStatus.correct ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" :
              tgStatus.configured ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800" :
              "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            }`}>
              {tgStatus.correct ? (
                <Wifi className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm flex items-center gap-1.5">
                  {tgStatus.error ? (
                    <><XCircle className="w-4 h-4 shrink-0" /> {tgStatus.error}</>
                  ) : tgStatus.correct ? (
                    <><CheckCircle className="w-4 h-4 shrink-0" /> Вебхук настроен корректно</>
                  ) : tgStatus.configured ? (
                    <><AlertTriangle className="w-4 h-4 shrink-0" /> Вебхук настроен на другой URL</>
                  ) : (
                    <><XCircle className="w-4 h-4 shrink-0" /> Вебхук не настроен — кнопки в Telegram не работают!</>
                  )}
                </p>
                {tgStatus.webhookUrl && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">URL: {tgStatus.webhookUrl}</p>
                )}
                {tgStatus.pendingUpdateCount !== undefined && tgStatus.pendingUpdateCount > 0 && (
                  <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" /> {tgStatus.pendingUpdateCount} необработанных обновлений в очереди</p>
                )}
                {tgStatus.lastErrorMessage && (
                  <p className="text-xs text-destructive mt-1">Последняя ошибка ({tgStatus.lastErrorDate}): {tgStatus.lastErrorMessage}</p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={setupTelegram}
              disabled={tgSetting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {tgSetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {tgStatus?.correct ? "Переустановить вебхук" : "Настроить вебхук"}
            </button>
            <button
              onClick={testTelegram}
              disabled={tgTesting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border hover:bg-primary/[0.08] text-sm font-medium transition-colors disabled:opacity-50"
            >
              {tgTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Отправить тест
            </button>
          </div>

          {/* Result message */}
          {tgResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
              tgResult.ok
                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-destructive/5 text-destructive border border-destructive/20"
            }`}>
              {tgResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {tgResult.message || tgResult.error}
            </div>
          )}

          {/* Setup instructions */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none list-none flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Как получить TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID?
            </summary>
            <div className="mt-3 p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-xs text-muted-foreground">
              <p><strong className="text-foreground">1. TELEGRAM_BOT_TOKEN</strong></p>
              <p>• Открыть Telegram → найти @BotFather → /newbot</p>
              <p>• Придумать имя и username для бота</p>
              <p>• Скопировать токен вида: <code className="bg-muted px-1 py-0.5 rounded">1234567890:AABBcc...</code></p>
              <p className="pt-1"><strong className="text-foreground">2. TELEGRAM_CHAT_ID</strong></p>
              <p>• Добавить бота в нужную группу (или личный чат)</p>
              <p>• Написать /start в группе</p>
              <p>• Открыть: <code className="bg-muted px-1 py-0.5 rounded">https://api.telegram.org/bot&#123;TOKEN&#125;/getUpdates</code></p>
              <p>• Найти поле <code className="bg-muted px-1 py-0.5 rounded">chat.id</code> — это и есть CHAT_ID (для групп отрицательное число)</p>
              <p className="pt-1"><strong className="text-foreground">3. Добавить в Vercel</strong></p>
              <p>• Dashboard → Settings → Environment Variables → добавить обе переменные → Redeploy</p>
            </div>
          </details>
        </div>
      </div>

    </div>
  );
}
