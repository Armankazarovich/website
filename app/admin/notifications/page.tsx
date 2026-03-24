"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Send, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function NotificationsPage() {
  const [form, setForm] = useState({ title: "", body: "", url: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!form.title || !form.body) {
      setError("Заполните заголовок и текст");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Push уведомления</h1>
          <p className="text-sm text-muted-foreground">Ручная рассылка всем подписчикам</p>
        </div>
      </div>

      <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
        <p>🛒 <strong>Автоматически:</strong> новый заказ → пуш всем подписчикам</p>
        <p>📦 <strong>Автоматически:</strong> смена статуса → пуш клиенту который сделал заказ</p>
        <p>📣 <strong>Вручную:</strong> форма ниже — рассылка всем кто разрешил уведомления</p>
      </div>

      <form onSubmit={handleSend} className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Отправить уведомление</h2>

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
            <><Send className="w-4 h-4 mr-2" /> Отправить всем</>
          )}
        </Button>
      </form>
    </div>
  );
}
