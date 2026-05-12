"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Inbox,
  Loader2,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Star,
  Trash2,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { NotificationSettingsPanel } from "@/components/admin/notification-settings-panel";
import { SidePanel } from "@/components/store/side-panel";
import { ARAY_ICON_TONE } from "@/lib/aray-design-tokens";
import { cn } from "@/lib/utils";

type FeedItemKind =
  | "new_order"
  | "pending_review"
  | "pending_staff"
  | "notification_issue"
  | "task_assigned";

type FeedItem = {
  id: string;
  kind: FeedItemKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  tone: "primary" | "warning" | "danger" | "muted";
};

type FeedResponse = {
  total: number;
  newOrders: number;
  pendingReviews: number;
  pendingStaff: number;
  notificationIssues: number;
  assignedTasks: number;
  quietActive: boolean;
  items: FeedItem[];
};

type CenterEvent = {
  id: string;
  status: "DRAFT" | "QUEUED" | "SENT" | "PARTIAL" | "FAILED" | "READ" | "ARCHIVED";
  channel: "PUSH" | "TELEGRAM" | "EMAIL" | "SMS" | "SYSTEM" | "ARAY";
  source: string;
  title: string;
  body: string;
  url?: string | null;
  entityLabel?: string | null;
  entityHref?: string | null;
  error?: string | null;
  createdAt: string;
  readAt?: string | null;
  archivedAt?: string | null;
};

type CenterResponse = {
  events: CenterEvent[];
};

type PanelTab = "signals" | "journal" | "archive" | "settings";

const EMPTY_FEED: FeedResponse = {
  total: 0,
  newOrders: 0,
  pendingReviews: 0,
  pendingStaff: 0,
  notificationIssues: 0,
  assignedTasks: 0,
  quietActive: false,
  items: [],
};

const KIND_META: Record<FeedItemKind, { icon: LucideIcon; className: string }> = {
  new_order: { icon: ShoppingBag, className: "text-primary" },
  pending_review: { icon: Star, className: "text-amber-500" },
  pending_staff: { icon: UserPlus, className: "text-primary" },
  notification_issue: { icon: AlertTriangle, className: "text-destructive" },
  task_assigned: { icon: ClipboardList, className: "text-muted-foreground" },
};

const CHANNEL_LABELS: Record<CenterEvent["channel"], string> = {
  PUSH: "Push",
  TELEGRAM: "Telegram",
  EMAIL: "Email",
  SMS: "SMS",
  SYSTEM: "Внутри ARAY",
  ARAY: "ARAY",
};

const STATUS_LABELS: Record<CenterEvent["status"], string> = {
  DRAFT: "Черновик",
  QUEUED: "В очереди",
  SENT: "Доставлено",
  PARTIAL: "Частично",
  FAILED: "Ошибка",
  READ: "Прочитано",
  ARCHIVED: "Архив",
};

const TABS: Array<{ id: PanelTab; label: string; icon: LucideIcon }> = [
  { id: "signals", label: "Сигналы", icon: Bell },
  { id: "journal", label: "Журнал", icon: Inbox },
  { id: "archive", label: "Архив", icon: Archive },
  { id: "settings", label: "Настройки", icon: Settings2 },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canOpenCenter(role: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

function canDeleteEvents(role: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/35 px-4 py-10 text-center">
      <div className={`${ARAY_ICON_TONE} mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function CenterEventCard({
  event,
  actionId,
  canDelete,
  deleteConfirmId,
  onAskDelete,
  onAction,
  onNavigate,
}: {
  event: CenterEvent;
  actionId: string | null;
  canDelete: boolean;
  deleteConfirmId: string | null;
  onAskDelete: (id: string | null) => void;
  onAction: (id: string, action: "read" | "unread" | "archive" | "delete") => void;
  onNavigate?: () => void;
}) {
  const relationHref = event.entityHref || event.url || null;
  const busy = actionId?.startsWith(`${event.id}:`) ?? false;
  const confirmingDelete = deleteConfirmId === event.id;
  return (
    <article className="rounded-2xl border border-border bg-background/35 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-border bg-muted/35 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {STATUS_LABELS[event.status] ?? event.status}
            </span>
            <span className="rounded-full border border-border bg-muted/35 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {CHANNEL_LABELS[event.channel] ?? event.channel}
            </span>
            {event.readAt && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                прочитано
              </span>
            )}
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">{event.title}</h3>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{event.body}</p>
        </div>
        <span className="shrink-0 text-right text-[11px] text-muted-foreground">{formatDate(event.createdAt)}</span>
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
              onClick={onNavigate}
              className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground"
            >
              Открыть
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
          {event.error && (
            <span className="admin-alert admin-alert-danger inline-flex min-h-8 items-center gap-2 px-2.5 py-1 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {event.error}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(event.id, event.readAt ? "unread" : "read")}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {event.readAt ? "Снять прочитано" : "Прочитано"}
        </button>
        {!event.archivedAt && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(event.id, "archive")}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" />
            В архив
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirmingDelete) {
                onAction(event.id, "delete");
              } else {
                onAskDelete(event.id);
              }
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-destructive/25 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmingDelete ? "Подтвердить" : "Удалить"}
          </button>
        )}
        {confirmingDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAskDelete(null)}
            className="inline-flex min-h-9 items-center rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground disabled:opacity-50"
          >
            Отмена
          </button>
        )}
      </div>
    </article>
  );
}

export function AdminNotificationBell({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("signals");
  const [feed, setFeed] = useState<FeedResponse>(EMPTY_FEED);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centerEvents, setCenterEvents] = useState<CenterEvent[]>([]);
  const [centerLoading, setCenterLoading] = useState(false);
  const [centerError, setCenterError] = useState<string | null>(null);
  const [centerRefreshing, setCenterRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadFeed = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/feed?take=10", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !Array.isArray(data.items)) {
        throw new Error(data?.error || "Не удалось загрузить уведомления");
      }
      setFeed({ ...EMPTY_FEED, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить уведомления");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadCenter = useCallback(async (status: "ARCHIVED" | null, showRefresh = false) => {
    if (showRefresh) setCenterRefreshing(true);
    setCenterLoading(true);
    setCenterError(null);
    try {
      const params = new URLSearchParams({ take: "30" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/notifications/center?${params.toString()}`, { cache: "no-store" });
      const data: CenterResponse | null = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.events)) {
        throw new Error((data as { error?: string } | null)?.error || "Не удалось загрузить журнал уведомлений.");
      }
      setCenterEvents(data.events);
    } catch (err) {
      setCenterError(err instanceof Error ? err.message : "Не удалось загрузить журнал уведомлений.");
    } finally {
      setCenterLoading(false);
      setCenterRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadFeed();
    }, 60000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadFeed();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadFeed]);

  useEffect(() => {
    if (!open) return;
    if (tab === "journal") loadCenter(null);
    if (tab === "archive") loadCenter("ARCHIVED");
  }, [loadCenter, open, tab]);

  const updateCenterEvent = useCallback(
    async (id: string, action: "read" | "unread" | "archive" | "delete") => {
      setActionId(`${id}:${action}`);
      setDeleteConfirmId(null);
      setCenterError(null);
      try {
        const res = await fetch("/api/admin/notifications/center", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Не удалось обновить уведомление.");
        }
        await loadCenter(tab === "archive" ? "ARCHIVED" : null, true);
        await loadFeed();
      } catch (err) {
        setCenterError(err instanceof Error ? err.message : "Не удалось обновить уведомление.");
      } finally {
        setActionId(null);
      }
    },
    [loadCenter, loadFeed, tab],
  );

  const count = feed.total;
  const centerAllowed = canOpenCenter(role);
  const deleteAllowed = canDeleteEvents(role);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            setTab("signals");
            loadFeed(true);
          }
        }}
        aria-label="Уведомления"
        title="Уведомления"
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground",
          open && "bg-primary/[0.08] text-foreground",
        )}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        maxWidth="540px"
        panelClassName="admin-popup-liquid border-border bg-card shadow-2xl"
        customHeader={
          <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`${ARAY_ICON_TONE} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold leading-tight text-foreground">Уведомления</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    Сигналы, архив, прочитанное и настройки ролей
                  </span>
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    {count}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={refreshing || centerRefreshing}
                  onClick={() => {
                    if (tab === "signals") loadFeed(true);
                    if (tab === "journal") loadCenter(null, true);
                    if (tab === "archive") loadCenter("ARCHIVED", true);
                  }}
                  aria-label="Обновить уведомления"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", (refreshing || centerRefreshing) && "animate-spin")} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Закрыть уведомления"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-background/35 p-1">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors",
                    active
                      ? "bg-primary/[0.12] text-primary"
                      : "text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {tab === "signals" && (
            <div className="space-y-3">
              {feed.quietActive && (
                <div className="rounded-2xl border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                  Тихий режим активен: ARAY не будет дергать команду без необходимости.
                </div>
              )}
              {loading ? (
                <div className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загружаю
                </div>
              ) : error ? (
                <div className="admin-alert admin-alert-danger flex items-start gap-2 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : feed.items.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title="Новых сигналов нет"
                  desc="Склад, заказы и команда без срочных событий."
                />
              ) : (
                <div className="space-y-2">
                  {feed.items.map((item) => {
                    const meta = KIND_META[item.kind] ?? KIND_META.task_assigned;
                    const Icon = meta.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-background/35 p-3.5 text-left transition-colors hover:border-primary/25 hover:bg-primary/[0.06]"
                      >
                        <span className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
                          <Icon className={cn("h-4 w-4", meta.className)} strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</span>
                          <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.body}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1 text-[10px] text-muted-foreground">
                          {formatDate(item.createdAt)}
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
              {centerAllowed && (
                <Link
                  href="/admin/notifications"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground"
                >
                  Открыть страницу уведомлений
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}

          {(tab === "journal" || tab === "archive") && (
            <div className="space-y-3">
              {centerError && (
                <div className="admin-alert admin-alert-danger flex items-start gap-2 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{centerError}</span>
                </div>
              )}
              {centerLoading ? (
                <div className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загружаю журнал
                </div>
              ) : centerEvents.length === 0 ? (
                <EmptyState
                  icon={tab === "archive" ? <Archive className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
                  title={tab === "archive" ? "Архив пуст" : "Журнал пока пуст"}
                  desc={tab === "archive" ? "Сюда попадут закрытые уведомления." : "Здесь появятся отправки, ошибки доставки и входящие события."}
                />
              ) : (
                <div className="space-y-2">
                  {centerEvents.map((event) => (
                    <CenterEventCard
                      key={event.id}
                      event={event}
                      actionId={actionId}
                      canDelete={deleteAllowed}
                      deleteConfirmId={deleteConfirmId}
                      onAskDelete={setDeleteConfirmId}
                      onAction={updateCenterEvent}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "settings" && <NotificationSettingsPanel onNavigate={() => setOpen(false)} />}
        </div>
      </SidePanel>
    </>
  );
}
