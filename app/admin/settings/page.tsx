"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Clock, BarChart2, AlertTriangle, Zap } from "lucide-react";

type SyncLog = {
  syncedAt: string;
  synced: number;
  errorCount: number;
  errors: string[];
  triggeredBy: "auto" | "manual";
};

function formatSyncTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  return `${days} д назад`;
}

export default function AdminSettingsPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);
  const [syncError, setSyncError] = useState("");
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetch("/api/sync/status")
      .then((r) => r.json())
      .then((data) => { if (data && data.syncedAt) setLastSync(data); })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

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
      // Refresh last sync status
      const statusRes = await fetch("/api/sync/status");
      const statusData = await statusRes.json();
      if (statusData && statusData.syncedAt) setLastSync(statusData);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display font-bold text-2xl">Настройки</h1>

      {/* Google Sheets sync */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Синхронизация с Google Sheets</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Обновление цен и размеров из таблицы Google Sheets (ID: 19rN2YNzrn6IHOXnyzDB_JHUGSC-KLxfRHqwfhD3_lmg).
          Автосинхронизация происходит каждые 6 часов.
        </p>

        {/* Статус последней синхронизации */}
        {!loadingStatus && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Статус синхронизации
            </p>

            {lastSync ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Последняя:</span>
                    <span className="font-semibold">{formatSyncTime(lastSync.syncedAt)}</span>
                    <span className="text-xs text-muted-foreground">({timeAgo(lastSync.syncedAt)})</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="font-semibold">{lastSync.synced}</span>
                    <span>позиций обновлено</span>
                  </div>

                  {lastSync.errorCount > 0 ? (
                    <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="font-semibold">{lastSync.errorCount}</span>
                      <span>ошибок</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Без ошибок</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{lastSync.triggeredBy === "auto" ? "Авто" : "Ручная"}</span>
                  </div>
                </div>

                {lastSync.errors.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-destructive hover:opacity-80">
                      Показать ошибки ({lastSync.errors.length})
                    </summary>
                    <ul className="mt-2 space-y-1 pl-3 border-l border-destructive/30">
                      {lastSync.errors.map((e, i) => (
                        <li key={i} className="text-muted-foreground">{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Синхронизация ещё не выполнялась</p>
            )}
          </div>
        )}

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

    </div>
  );
}
