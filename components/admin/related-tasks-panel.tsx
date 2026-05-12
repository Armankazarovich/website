"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_RELATION_LABELS, type TaskRelationEntityType } from "@/lib/task-relations";

type RelatedTask = {
  id: string;
  title: string;
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  createdAt: string;
  assignee?: { id: string; name?: string | null; email?: string | null } | null;
  relations?: Array<{
    id: string;
    entityType: TaskRelationEntityType;
    entityId: string;
    label?: string | null;
    href?: string | null;
  }>;
};

const STATUS_META: Record<RelatedTask["status"], { label: string; className: string }> = {
  BACKLOG: { label: "Очередь", className: "border-border bg-muted/35 text-muted-foreground" },
  TODO: { label: "Сделать", className: "border-border bg-muted/35 text-foreground" },
  IN_PROGRESS: { label: "В работе", className: "border-amber-400/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  REVIEW: { label: "Проверка", className: "border-primary/25 bg-primary/10 text-primary" },
  DONE: { label: "Готово", className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
};

const PRIORITY_LABELS: Record<RelatedTask["priority"], string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  URGENT: "Срочно",
};

function formatDueDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: `просрочено ${Math.abs(days)}д`, overdue: true };
  if (days === 0) return { label: "сегодня", overdue: false };
  if (days === 1) return { label: "завтра", overdue: false };
  return { label: target.toLocaleDateString("ru-RU"), overdue: false };
}

function getTaskAssignee(task: RelatedTask) {
  return task.assignee?.name || task.assignee?.email || "Не назначена";
}

export function RelatedTasksPanel({
  entityType,
  entityId,
  entityLabel,
  entityHref,
  title = "Связанные задачи",
  className,
}: {
  entityType: TaskRelationEntityType;
  entityId: string;
  entityLabel: string;
  entityHref?: string;
  title?: string;
  className?: string;
}) {
  const [tasks, setTasks] = useState<RelatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<RelatedTask["priority"]>("MEDIUM");
  const [error, setError] = useState<string | null>(null);

  const entityName = TASK_RELATION_LABELS[entityType] ?? "Сущность";

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "DONE"),
    [tasks],
  );

  async function loadTasks(showRefresh = false) {
    if (!entityId) return;
    if (showRefresh) setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({ entityType, entityId });
      const res = await fetch(`/api/admin/tasks?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.tasks)) {
        throw new Error(data?.error || "Не удалось загрузить связанные задачи.");
      }
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить связанные задачи.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function createTask() {
    const titleText = newTitle.trim();
    if (!titleText) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleText,
          priority: newPriority,
          status: "TODO",
          orderId: entityType === "ORDER" ? entityId : undefined,
          orderLabel: entityType === "ORDER" ? entityLabel : undefined,
          relations: [
            {
              entityType,
              entityId,
              label: entityLabel,
              href: entityHref,
            },
          ],
        }),
      });
      const task = await res.json().catch(() => null);
      if (!res.ok || !task?.id) {
        throw new Error(task?.error || "Не удалось создать задачу.");
      }
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      setNewPriority("MEDIUM");
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckSquare className="h-4 w-4 text-primary" />
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {entityName}: {entityLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => loadTasks(true)}
            disabled={refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Обновить связанные задачи"
            title="Обновить"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => setFormOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label="Добавить связанную задачу"
            title="Добавить задачу"
          >
            {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background/45 px-3 py-2">
          <p className="text-lg font-semibold text-foreground">{openTasks.length}</p>
          <p className="text-[11px] text-muted-foreground">открыто</p>
        </div>
        <div className="rounded-xl border border-border bg-background/45 px-3 py-2">
          <p className="text-lg font-semibold text-foreground">{tasks.length}</p>
          <p className="text-[11px] text-muted-foreground">всего</p>
        </div>
      </div>

      {formOpen && (
        <div className="mt-3 space-y-2 rounded-2xl border border-border bg-muted/20 p-3">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Что нужно сделать по этой сущности"
            className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value as RelatedTask["priority"])}
              className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={createTask}
              disabled={creating || !newTitle.trim()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Создать
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert-danger mt-3 flex items-start gap-2 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загружаю задачи
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/35 px-3 py-6 text-center text-sm text-muted-foreground">
            Связанных задач пока нет.
          </div>
        ) : (
          tasks.slice(0, 5).map((task) => {
            const status = STATUS_META[task.status] ?? STATUS_META.TODO;
            const due = formatDueDate(task.dueDate);
            return (
              <article key={task.id} className="rounded-2xl border border-border bg-background/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{getTaskAssignee(task)}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold", status.className)}>
                    {status.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{PRIORITY_LABELS[task.priority]}</span>
                  {due && (
                    <span className={cn("inline-flex items-center gap-1", due.overdue && "text-destructive")}>
                      {due.overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {due.label}
                    </span>
                  )}
                  {task.status === "DONE" && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      закрыта
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <Link
        href={`/admin/tasks?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" />
        Открыть в задачах
      </Link>
    </section>
  );
}
