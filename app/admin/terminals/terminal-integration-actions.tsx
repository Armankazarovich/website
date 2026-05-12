"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Database, Loader2, Plug, RefreshCw, Search, Send } from "lucide-react";

type Connector = {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  trustLevel: string;
  mode: string;
  capabilities: string[];
};

type SyncJob = {
  id: string;
  channel: string;
  event: string;
  entityType: string;
  status: string;
  createdAt: string;
  connector?: { name: string; type: string; provider: string } | null;
};

type IntegrationData = {
  connectors: Connector[];
  recentJobs: SyncJob[];
  stats: {
    connectors: Record<string, number>;
    jobs: Record<string, number>;
    index: Record<string, number>;
    queuedJobs: number;
    failedJobs: number;
  };
};

const EMPTY_DATA: IntegrationData = {
  connectors: [],
  recentJobs: [],
  stats: { connectors: {}, jobs: {}, index: {}, queuedJobs: 0, failedJobs: 0 },
};

function statusText(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "включено",
    NEEDS_PROVIDER: "нужен провайдер",
    NEEDS_CONNECTOR: "нужен коннектор",
    VENDOR_READY: "готово по схеме",
    PLANNED: "план",
    QUEUED: "в очереди",
    FAILED: "ошибка",
  };
  return map[status] || status;
}

export function TerminalIntegrationActions() {
  const [data, setData] = useState<IntegrationData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/terminal/integrations");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      setMessage("Ошибка сети при загрузке интеграций");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const run = async (action: string, success: string) => {
    if (busy) return;
    setBusy(action);
    setMessage("");
    try {
      const res = await fetch("/api/admin/terminal/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(payload.error || "Не получилось выполнить действие");
        return;
      }
      setMessage(success);
      await load();
    } catch {
      setMessage("Ошибка сети при выполнении действия");
    } finally {
      setBusy("");
    }
  };

  const activeConnectors = data.connectors.filter((connector) => connector.status === "ACTIVE").length;
  const plannedConnectors = data.connectors.filter((connector) => connector.status !== "ACTIVE").length;
  const indexTotal = Object.values(data.stats.index || {}).reduce((sum, value) => sum + value, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Синхронизации, индексация и уведомления</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Единый контур для CRM, заказов сайта, QR-оплаты, печати, склада, бухгалтерии, поиска и Арая.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading || Boolean(busy)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Обновить
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Активные", activeConnectors, "работают внутри системы"],
          ["К подключению", plannedConnectors, "провайдеры и устройства"],
          ["Очередь", data.stats.queuedJobs, "jobs ждут обработки"],
          ["Индекс", indexTotal, "поиск и контекст Арая"],
        ].map(([title, value, text]) => (
          <div key={title} className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{loading ? "..." : value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => run("seed", "Коннекторы подготовлены")}
          disabled={Boolean(busy)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
        >
          {busy === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Подготовить коннекторы
        </button>
        <button
          type="button"
          onClick={() => run("reindex", "Индекс терминала пересобран")}
          disabled={Boolean(busy)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
        >
          {busy === "reindex" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Пересобрать индекс
        </button>
        <button
          type="button"
          onClick={() => run("healthcheck", "Проверка интеграций поставлена в очередь")}
          disabled={Boolean(busy)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
        >
          {busy === "healthcheck" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Проверить обмен
        </button>
        <button
          type="button"
          onClick={() => run("qr-notification-check", "Проверка QR и уведомлений поставлена в очередь")}
          disabled={Boolean(busy)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy === "qr-notification-check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          QR и уведомления
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Карта подключений</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {(data.connectors.length ? data.connectors : []).slice(0, 12).map((connector) => (
              <div key={connector.id} className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{connector.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{connector.type} · {connector.mode}</p>
                  </div>
                  <span className="shrink-0 rounded-xl border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">
                    {statusText(connector.status)}
                  </span>
                </div>
              </div>
            ))}
            {!loading && data.connectors.length === 0 && (
              <p className="text-xs text-muted-foreground">Нажмите “Подготовить коннекторы”, чтобы создать базовую карту.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Последние события</p>
          </div>
          <div className="space-y-2">
            {data.recentJobs.slice(0, 6).map((job) => (
              <div key={job.id} className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{job.event}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{job.channel} · {job.entityType}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-primary">{statusText(job.status)}</span>
                </div>
              </div>
            ))}
            {!loading && data.recentJobs.length === 0 && (
              <p className="text-xs text-muted-foreground">Событий синхронизации пока нет.</p>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </div>
      )}
    </section>
  );
}
