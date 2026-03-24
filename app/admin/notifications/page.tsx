"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Send, Loader2, CheckCircle, XCircle, Users, UserCheck, UserX, Clock, ShoppingBag } from "lucide-react";

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
          <h1 className="text-2xl font-bold">Push уведомления</h1>
          <p className="text-sm text-muted-foreground">Рассылка и база подписчиков</p>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("send")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "send" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Рассылка
        </button>
        <button
          onClick={() => setTab("subscribers")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "subscribers" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Подписчики {subs.length > 0 && <span className="ml-1 text-xs text-primary">({subs.length})</span>}
        </button>
      </div>

      {/* Таб: Рассылка */}
      {tab === "send" && (
        <div className="space-y-5">
          <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
            <p>🛒 <strong>Авто:</strong> новый заказ → пуш сотрудникам + клиенту</p>
            <p>📦 <strong>Авто:</strong> смена статуса → пуш клиенту</p>
            <p>💡 <strong>Авто:</strong> советы каждый понедельник, акции по пятницам</p>
            <p>📣 <strong>Вручную:</strong> форма ниже — рассылка по сегменту</p>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      segment === s.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    subsFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
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
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                          {s.email || s.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.isRegistered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs font-medium">
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
    </div>
  );
}
