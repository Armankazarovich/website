"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationStatus =
  | "DRAFT"
  | "QUEUED"
  | "SENT"
  | "PARTIAL"
  | "FAILED"
  | "READ"
  | "ARCHIVED";

type NotificationChannel = "PUSH" | "TELEGRAM" | "EMAIL" | "SMS" | "SYSTEM" | "ARAY";
type NotificationDirection = "INBOUND" | "OUTBOUND" | "SYSTEM";
type NotificationSource = "ADMIN" | "ARAY" | "SYSTEM" | "AUTOMATION" | "ORDER" | "TASK" | "TELEGRAM";

type NotificationCenterEvent = {
  id: string;
  direction: NotificationDirection;
  channel: NotificationChannel;
  status: NotificationStatus;
  source: NotificationSource;
  title: string;
  body: string;
  url?: string | null;
  segment?: string | null;
  recipientLabel?: string | null;
  sentCount: number;
  failedCount: number;
  cleanedCount: number;
  error?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  entityHref?: string | null;
  createdAt: string;
  sentAt?: string | null;
  readAt?: string | null;
  archivedAt?: string | null;
};

type NotificationCenterResponse = {
  events: NotificationCenterEvent[];
  summary: {
    total: number;
    queued: number;
    sent: number;
    partial: number;
    failed: number;
    inbound: number;
  };
};

const STATUS_META: Record<NotificationStatus, { label: string; className: string }> = {
  DRAFT: { label: "Черновик", className: "border-border bg-muted/35 text-muted-foreground" },
  QUEUED: { label: "В очереди", className: "border-border bg-muted/35 text-muted-foreground" },
  SENT: { label: "Доставлено", className: "border-primary/25 bg-primary/10 text-primary" },
  PARTIAL: { label: "Частично", className: "border-amber-400/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  FAILED: { label: "Ошибка", className: "border-border bg-muted/35 text-foreground" },
  READ: { label: "Прочитано", className: "border-primary/20 bg-primary/10 text-primary" },
  ARCHIVED: { label: "Архив", className: "border-border bg-muted/35 text-muted-foreground" },
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  PUSH: "Push",
  TELEGRAM: "Telegram",
  EMAIL: "Email",
  SMS: "SMS",
  SYSTEM: "Внутри ARAY",
  ARAY: "ARAY",
};

const SOURCE_LABELS: Record<NotificationSource, string> = {
  ADMIN: "Админка",
  ARAY: "ARAY",
  SYSTEM: "ARAY OS",
  AUTOMATION: "Автоматизация",
  ORDER: "Заказ",
  TASK: "Задача",
  TELEGRAM: "Telegram",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: NotificationStatus }) {
  if (status === "SENT" || status === "READ") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "FAILED") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "PARTIAL") return <AlertTriangle className="h-3.5 w-3.5" />;
  if (status === "ARCHIVED") return <Archive className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function NotificationCenterPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<NotificationCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const events = data?.events ?? [];
  const summary = data?.summary;

  const openCount = useMemo(
    () => (summary ? summary.queued + summary.partial + summary.failed : 0),
    [summary],
  );

  const loadCenter = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/center?take=40", { cache: "no-store" });
      const nextData = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(nextData?.events)) {
        throw new Error(nextData?.error || "Не удалось загрузить центр уведомлений.");
      }
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить центр уведомлений.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCenter();
  }, [loadCenter, refreshKey]);

  const updateEvent = useCallback(async (id: string, action: "read" | "unread" | "archive") => {
    setActionId(`${id}:${action}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/center", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const nextData = await res.json().catch(() => null);
      if (!res.ok || !nextData?.ok) {
        throw new Error(nextData?.error || "Не удалось обновить событие.");
      }
      await loadCenter(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить событие.");
    } finally {
      setActionId(null);
    }
  }, [loadCenter]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Bell} label="Всего событий" value={summary?.total ?? 0} />
        <SummaryCard icon={Send} label="Доставлено" value={summary?.sent ?? 0} />
        <SummaryCard icon={AlertTriangle} label="Требует внимания" value={openCount} />
        <SummaryCard icon={Inbox} label="Входящие" value={summary?.inbound ?? 0} />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Inbox className="h-4 w-4 text-primary" />
              Центр уведомлений
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Журнал отправок, каналов, статусов доставки и связей с задачами.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadCenter(true)}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Обновить
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="admin-alert admin-alert-danger mb-4 flex items-start gap-2 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Загружаю события
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/35 px-4 py-10 text-center text-sm text-muted-foreground">
              Журнал пока пуст.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const status = STATUS_META[event.status] ?? STATUS_META.QUEUED;
                const relationHref = event.entityHref || event.url || null;
                return (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-border bg-background/35 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", status.className)}>
                            <StatusIcon status={event.status} />
                            {status.label}
                          </span>
                          <span className="rounded-full border border-border bg-muted/35 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {CHANNEL_LABELS[event.channel] ?? event.channel}
                          </span>
                          <span className="rounded-full border border-border bg-muted/35 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {SOURCE_LABELS[event.source] ?? event.source}
                          </span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                          {event.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {event.body}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatDate(event.createdAt)}</p>
                        {event.readAt && <p className="mt-1 text-primary">прочитано</p>}
                        {event.sentAt && <p className="mt-1">отпр. {formatDate(event.sentAt)}</p>}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {event.segment && <span>сегмент: {event.segment}</span>}
                      {event.recipientLabel && <span>получатель: {event.recipientLabel}</span>}
                      <span>доставлено: {event.sentCount}</span>
                      {event.failedCount > 0 && <span>ошибок: {event.failedCount}</span>}
                      {event.cleanedCount > 0 && <span>очищено: {event.cleanedCount}</span>}
                    </div>

                    {(event.entityLabel || relationHref || event.error) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {event.entityLabel && (
                          <span className="inline-flex min-h-8 items-center rounded-xl border border-border bg-muted/30 px-2.5 text-xs font-medium text-foreground">
                            {event.entityLabel}
                          </span>
                        )}
                        {relationHref && (
                          <Link
                            href={relationHref}
                            className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Открыть
                          </Link>
                        )}
                        {event.error && (
                          <div className="admin-alert admin-alert-danger flex min-h-8 items-center gap-2 px-2.5 py-1 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>{event.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateEvent(event.id, event.readAt ? "unread" : "read")}
                        disabled={actionId !== null}
                        className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {event.readAt ? "Снять прочитано" : "Прочитано"}
                      </button>
                      {!event.archivedAt && (
                        <button
                          type="button"
                          onClick={() => updateEvent(event.id, "archive")}
                          disabled={actionId !== null}
                          className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground disabled:opacity-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          В архив
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
