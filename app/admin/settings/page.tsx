"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Bell, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);
  const [syncError, setSyncError] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [pushResult, setPushResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError("");
    try {
      const res = await fetch("/api/sync/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResult(data);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushTitle || !pushBody) return;
    setSending(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pushTitle, body: pushBody, url: pushUrl }),
      });
      const data = await res.json();
      setPushResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display font-bold text-2xl">Настройки</h1>

      {/* Google Sheets sync */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Синхронизация с Google Sheets</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Обновление цен и размеров из таблицы Google Sheets (ID: 19rN2YNzrn6IHOXnyzDB_JHUGSC-KLxfRHqwfhD3_lmg).
          Автосинхронизация происходит каждые 6 часов.
        </p>

        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Синхронизирую...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" /> Синхронизировать сейчас</>
          )}
        </Button>

        {syncResult && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Обновлено {syncResult.synced} позиций
            {syncResult.errors.length > 0 && `, ${syncResult.errors.length} ошибок`}
          </div>
        )}
        {syncError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {syncError}
          </div>
        )}
      </div>

      {/* Push notifications */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Push-уведомления</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Отправить push-уведомление всем подписанным пользователям.
        </p>

        <div className="space-y-3">
          <div>
            <Label>Заголовок *</Label>
            <Input
              className="mt-1"
              placeholder="ПилоРус — Новая акция!"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Текст *</Label>
            <Input
              className="mt-1"
              placeholder="Скидка 15% на доску обрезную до конца недели"
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
            />
          </div>
          <div>
            <Label>Ссылка (необязательно)</Label>
            <Input
              className="mt-1"
              placeholder="/promotions"
              value={pushUrl}
              onChange={(e) => setPushUrl(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSendPush} disabled={sending || !pushTitle || !pushBody}>
          {sending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Отправляю...</>
          ) : (
            <><Bell className="w-4 h-4 mr-2" /> Отправить всем</>
          )}
        </Button>

        {pushResult && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Отправлено: {pushResult.sent}, ошибок: {pushResult.failed}
          </div>
        )}
      </div>
    </div>
  );
}
