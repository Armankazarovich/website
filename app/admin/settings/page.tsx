"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);
  const [syncError, setSyncError] = useState("");

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

    </div>
  );
}
