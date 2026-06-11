"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, User,
  MessageSquare, Loader2, CheckCircle2, Clock,
  AlertTriangle, Zap, Link as LinkIcon,
  ArrowRight, Search,
  Inbox, Square, RefreshCw, Eye, Flame,
  ArrowDown, Minus, ArrowUp,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminModal } from "@/components/admin/admin-modal";
import { TASK_RELATION_LABELS, type TaskRelationEntityType } from "@/lib/task-relations";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  user?: { id: string; name?: string };
};

type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  sortOrder: number;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  tags: string[];
  assignee?: { id: string; name?: string; email: string };
  createdBy?: { id: string; name?: string };
  order?: { id: string; orderNumber: number; guestName?: string };
  relations?: {
    id: string;
    entityType: TaskRelationEntityType;
    entityId: string;
    label?: string | null;
    href?: string | null;
  }[];
  comments: Comment[];
};

type Staff = { id: string; name?: string; email: string; role: string };

function isTaskPayload(value: unknown): value is Task {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Task).id === "string" &&
    typeof (value as Task).title === "string" &&
    typeof (value as Task).status === "string",
  );
}

function isCommentPayload(value: unknown): value is Comment {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Comment).id === "string" &&
    typeof (value as Comment).text === "string",
  );
}

function getApiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  return fallback;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: "BACKLOG",     label: "Очередь",  icon: Inbox,        color: "text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/50" },
  { id: "TODO",        label: "Сделать",  icon: Square,       color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/40" },
  { id: "IN_PROGRESS", label: "В работе", icon: RefreshCw,    color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "REVIEW",      label: "Проверка", icon: Eye,          color: "text-primary",     bg: "bg-primary/5 dark:bg-primary/10" },
  { id: "DONE",        label: "Готово",   icon: CheckCircle2, color: "text-primary",     bg: "bg-primary/5 dark:bg-primary/10" },
];

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; icon: string; IconCmp: React.ElementType }> = {
  LOW:    { label: "Низкий",  color: "text-slate-400",  icon: "↓", IconCmp: ArrowDown },
  MEDIUM: { label: "Средний", color: "text-slate-400",  icon: "–", IconCmp: Minus },
  HIGH:   { label: "Высокий", color: "text-orange-500", icon: "↑", IconCmp: ArrowUp },
  URGENT: { label: "Срочно",  color: "text-red-500",    icon: "!", IconCmp: Flame },
};

function formatDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { text: `просрочено ${Math.abs(days)}д`, overdue: true };
  if (days === 0) return { text: "сегодня", overdue: false };
  if (days === 1) return { text: "завтра", overdue: false };
  return { text: `${days}д`, overdue: false };
}

function initials(name?: string, email?: string) {
  if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (email ?? "?")[0].toUpperCase();
}

function getTaskRelations(task: Task) {
  const relations = task.relations ?? [];
  if (task.order && !relations.some((relation) => relation.entityType === "ORDER" && relation.entityId === task.order?.id)) {
    return [
      ...relations,
      {
        id: `order-${task.order.id}`,
        entityType: "ORDER" as const,
        entityId: task.order.id,
        label: `Заказ #${task.order.orderNumber}`,
        href: `/admin/orders/${task.order.id}`,
      },
    ];
  }
  return relations;
}

function formatRelationLabel(relation: ReturnType<typeof getTaskRelations>[number]) {
  return relation.label || TASK_RELATION_LABELS[relation.entityType] || "Связь";
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({
  task, onOpen, onMove, isDragging, dragHandlers,
}: {
  task: Task;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
  isDragging: boolean;
  dragHandlers: Record<string, any>;
}) {
  const pm = PRIORITY_META[task.priority];
  const due = task.dueDate ? formatDate(task.dueDate) : null;
  const col = COLUMNS.find(c => c.id === task.status)!;
  const relations = getTaskRelations(task);

  return (
    <div
      {...dragHandlers}
      onClick={onOpen}
      className={`group bg-card border border-border rounded-2xl p-3.5 cursor-pointer
        hover:border-primary/40 transition-colors select-none
        ${isDragging ? "opacity-60 ring-2 ring-primary/30" : ""}
        ${task.priority === "URGENT" ? "border-l-4 border-l-red-400" : ""}
      `}
    >
      {/* Priority + order badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-bold ${pm.color}`}>
          {pm.icon} {pm.label}
        </span>
        {relations.length > 0 && (
          <span className="inline-flex max-w-[55%] items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <LinkIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{relations.length === 1 ? formatRelationLabel(relations[0]) : `${relations.length} связи`}</span>
          </span>
        )}
      </div>

      {/* Title */}
      <p className="font-semibold text-sm leading-snug mb-2 line-clamp-2">{task.title}</p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(t => (
            <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          {/* Assignee avatar */}
          {task.assignee ? (
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center" title={task.assignee.name ?? task.assignee.email}>
              {initials(task.assignee.name, task.assignee.email)}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center">
              ?
            </div>
          )}
          {/* Comments */}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length}
            </span>
          )}
        </div>

        {/* Due date */}
        {due && (
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${due.overdue ? "text-red-500" : "text-muted-foreground"}`}>
            {due.overdue && <AlertTriangle className="w-3 h-3" />}
            <Clock className="w-3 h-3" />
            {due.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Task Detail Modal ─────────────────────────────────────────────────────────
function TaskModal({
  task, staff, onClose, onUpdate, onDelete,
}: {
  task: Task;
  staff: Staff[];
  onClose: () => void;
  onUpdate: (t: Task) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(task.tags);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(task.comments);
  const [saving, setSaving] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError("Название задачи обязательно.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), priority, status, assigneeId: assigneeId || null, dueDate: dueDate || null, tags }),
      });
      const updated = await res.json().catch(() => null);
      if (!res.ok || !isTaskPayload(updated)) {
        throw new Error(getApiError(updated, "Не удалось сохранить задачу."));
      }
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить задачу.");
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setAddingComment(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", text: comment }),
      });
      const c = await res.json().catch(() => null);
      if (!res.ok || !isCommentPayload(c)) {
        throw new Error(getApiError(c, "Не удалось добавить комментарий."));
      }
      setComments(prev => [...prev, c]);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить комментарий.");
    } finally {
      setAddingComment(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const due = dueDate ? formatDate(dueDate) : null;
  const relations = getTaskRelations(task);
  const relationSubtitle =
    relations.length > 0
      ? `Связи: ${relations.map(formatRelationLabel).slice(0, 2).join(", ")}${relations.length > 2 ? ` +${relations.length - 2}` : ""}`
      : "Без связанных сущностей";

  return (
    <>
      <AdminModal
        open
        onClose={onClose}
        title={title.trim() || "Задача"}
        subtitle={relationSubtitle}
        size="xl"
        bodyClassName="p-4 sm:p-5"
        headerActions={(
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="admin-modal-action admin-modal-action-danger"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Удалить</span>
          </button>
        )}
        footer={(
          <>
            <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
              Создано {new Date(task.createdAt).toLocaleDateString("ru-RU")}
              {task.createdBy && ` · ${task.createdBy.name}`}
            </p>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Сохранить
            </button>
          </>
        )}
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Название задачи
                </label>
                <textarea
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="min-h-[96px] w-full resize-none rounded-xl border border-border bg-card px-3 py-3 text-base font-semibold leading-snug text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Название задачи..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Описание</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Опишите задачу подробнее..."
                  className="w-full resize-none rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Комментарии ({comments.length})
                </h3>
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(c.user?.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold">{c.user?.name ?? "Система"}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="break-words rounded-xl bg-muted px-3 py-2 text-sm">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    Комментариев пока нет
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), addComment())}
                    placeholder="Написать комментарий..."
                    className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={addComment}
                    disabled={addingComment || !comment.trim()}
                    className="flex min-h-11 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
                    aria-label="Добавить комментарий"
                  >
                    {addingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Статус</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as TaskStatus)}
                      className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Приоритет</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as TaskPriority)}
                      className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Object.entries(PRIORITY_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Исполнитель</label>
                    <select
                      value={assigneeId}
                      onChange={e => setAssigneeId(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Не назначен</option>
                      {staff.map(u => (
                        <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Срок</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {due?.overdue && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertTriangle className="w-3 h-3" /> {due.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Метки</label>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Добавить метку"
                    className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="flex min-h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    aria-label="Добавить метку"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs">
                        {t}
                        <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="text-muted-foreground hover:text-destructive">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Связи задачи</p>
                {relations.length > 0 ? (
                  <div className="space-y-2">
                    {relations.map((relation) => {
                      const content = (
                        <>
                          <LinkIcon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{formatRelationLabel(relation)}</span>
                          {relation.href && <ArrowRight className="h-3.5 w-3.5 shrink-0" />}
                        </>
                      );
                      return relation.href ? (
                        <Link
                          key={`${relation.entityType}-${relation.entityId}`}
                          href={relation.href}
                          className="flex min-h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 text-primary transition-colors hover:bg-primary/15"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          key={`${relation.entityType}-${relation.entityId}`}
                          className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Задача пока не связана с сущностью.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete(); onClose(); }}
        title="Удалить задачу?"
        description="Задача и все её комментарии будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
      />
    </>
  );
}

// ─── New Task Form ─────────────────────────────────────────────────────────────
function NewTaskForm({
  defaultStatus, staff, onAdd, onClose,
}: {
  defaultStatus: TaskStatus;
  staff: Staff[];
  onAdd: (task: Task) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), priority, status: defaultStatus, assigneeId: assigneeId || null, dueDate: dueDate || null }),
      });
      const task = await res.json().catch(() => null);
      if (!res.ok || !isTaskPayload(task)) {
        throw new Error(getApiError(task, "Не удалось создать задачу."));
      }
      onAdd(task);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border-2 border-primary/40 rounded-2xl p-3.5 space-y-2.5">
      <textarea
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submit())}
        placeholder="Название задачи..."
        rows={2}
        className="w-full text-sm font-medium bg-transparent border-none outline-none resize-none"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="text-xs border border-border rounded-xl px-2 py-1.5 bg-card focus:outline-none">
          {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="text-xs border border-border rounded-xl px-2 py-1.5 bg-card focus:outline-none">
          <option value="">Кому?</option>
          {staff.map(u => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
        </select>
      </div>
      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full text-xs border border-border rounded-xl px-2 py-1.5 bg-card focus:outline-none" />
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-primary/[0.08] transition-colors">Отмена</button>
        <button onClick={submit} disabled={saving || !title.trim()} className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Добавить"}
        </button>
      </div>
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function Column({
  col, tasks, staff, onAddTask, onOpenTask,
  dragging, dragOver, onDragStart, onDragOver, onDragEnd, onDrop,
  compact = false,
}: {
  col: typeof COLUMNS[0];
  tasks: Task[];
  staff: Staff[];
  onAddTask: (t: Task) => void;
  onOpenTask: (t: Task) => void;
  dragging: string | null;
  dragOver: string | null;
  onDragStart: (taskId: string) => void;
  onDragOver: (status: TaskStatus) => void;
  onDragEnd: () => void;
  onDrop: (status: TaskStatus) => void;
  compact?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const isOver = dragOver === col.id;

  return (
    <div
      className={`flex flex-col rounded-2xl border border-border/70 transition-colors ${compact ? "min-h-0 w-full" : "min-h-[200px] w-72 shrink-0"} ${col.bg} ${isOver ? "ring-2 ring-primary/35" : ""}`}
      onDragOver={e => { e.preventDefault(); onDragOver(col.id); }}
      onDrop={e => { e.preventDefault(); onDrop(col.id); }}
    >
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <col.icon className={`w-3.5 h-3.5 ${col.color}`} />
          <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
          <span className="text-xs bg-background/60 px-1.5 py-0.5 rounded-full font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {col.id !== "DONE" && (
          <button
            onClick={() => setAdding(true)}
            className="w-6 h-6 rounded-lg bg-background/60 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className={`px-3 pb-3 space-y-2.5 ${compact ? "" : "max-h-[calc(100vh-280px)] flex-1 overflow-y-auto"}`}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onOpen={() => onOpenTask(task)}
            onMove={() => {}}
            isDragging={dragging === task.id}
            dragHandlers={{
              draggable: true,
              onDragStart: () => onDragStart(task.id),
              onDragEnd: onDragEnd,
            }}
          />
        ))}

        {/* Drop indicator */}
        {isOver && dragging && (
          <div className="h-1 bg-primary rounded-full opacity-60" />
        )}

        {/* New task form */}
        {adding && (
          <NewTaskForm
            defaultStatus={col.id}
            staff={staff}
            onAdd={onAddTask}
            onClose={() => setAdding(false)}
          />
        )}

        {tasks.length === 0 && !adding && !isOver && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-background/35 px-4 py-8 text-center">
            <p className="text-xs font-medium text-muted-foreground">Нет задач</p>
            {col.id !== "DONE" && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
              >
                <Plus className="h-3.5 w-3.5" />
                Создать
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban ───────────────────────────────────────────────────────────────
export function TasksKanban({ initialTasks, initialStaff }: { initialTasks: Task[]; initialStaff: Staff[] }) {
  const searchParams = useSearchParams();
  const relationEntityType = searchParams.get("entityType") as TaskRelationEntityType | null;
  const relationEntityId = searchParams.get("entityId");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [staff] = useState<Staff[]>(initialStaff);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>("TODO");

  const refreshTasks = useCallback(async (showBusy = false) => {
    if (showBusy) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (relationEntityType && relationEntityId) {
        params.set("entityType", relationEntityType);
        params.set("entityId", relationEntityId);
      }
      const query = params.toString();
      const res = await fetch(`/api/admin/tasks${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getApiError(data, "Не удалось обновить задачи."));
      if (Array.isArray(data?.tasks)) setTasks(data.tasks);
      setBoardError(null);
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : "Не удалось обновить задачи.");
    } finally {
      if (showBusy) setRefreshing(false);
    }
  }, [relationEntityId, relationEntityType]);

  useEffect(() => {
    const interval = window.setInterval(() => refreshTasks(), 12000);
    const onFocus = () => refreshTasks();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshTasks();
    };
    const onArayRefresh = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const pathname =
        typeof detail?.pathname === "string"
          ? detail.pathname
          : typeof detail?.page === "string"
            ? detail.page
            : "";
      if (pathname && !pathname.startsWith("/admin/tasks")) return;
      void refreshTasks(true);
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("aray:refresh", onArayRefresh);
    window.addEventListener("aray:admin-refresh", onArayRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("aray:refresh", onArayRefresh);
      window.removeEventListener("aray:admin-refresh", onArayRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshTasks]);

  const filteredTasks = tasks.filter(t => {
    if (relationEntityType && relationEntityId) {
      const hasRelation = getTaskRelations(t).some(
        (relation) => relation.entityType === relationEntityType && relation.entityId === relationEntityId,
      );
      if (!hasRelation) return false;
    }
    const q = search.trim().toLowerCase();
    const haystack = [
      t.title,
      t.description ?? "",
      t.order ? `заказ ${t.order.orderNumber} ${t.order.guestName ?? ""}` : "",
      ...getTaskRelations(t).map((relation) => formatRelationLabel(relation)),
      t.assignee?.name ?? "",
      t.assignee?.email ?? "",
      ...t.tags,
    ].join(" ").toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee && t.assignee?.id !== filterAssignee) return false;
    return true;
  });

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks
      .filter(t => t.status === status)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  const activeMobileColumn = COLUMNS.find((col) => col.id === mobileStatus) ?? COLUMNS[1];

  const handleDrop = async (targetStatus: TaskStatus) => {
    if (!dragging) return;
    const taskId = dragging;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) { setDragging(null); setDragOver(null); return; }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));
    setDragging(null);
    setDragOver(null);
    setBoardError(null);

    // API call
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const updated = await res.json().catch(() => null);
      if (!res.ok || !isTaskPayload(updated)) {
        throw new Error(getApiError(updated, "Не удалось переместить задачу."));
      }
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      // Rollback
      setTasks(prev => prev.map(t => t.id === taskId ? task : t));
      setBoardError(err instanceof Error ? err.message : "Не удалось переместить задачу.");
    }
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setOpenTask(updated);
  };

  const handleDeleteTask = async (id: string) => {
    const res = await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setBoardError(getApiError(data, "Не удалось удалить задачу."));
      return;
    }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Stats
  const overdue = tasks.filter(t => t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < new Date()).length;
  const urgent = tasks.filter(t => t.priority === "URGENT" && t.status !== "DONE").length;
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const unassigned = tasks.filter(t => !t.assignee && t.status !== "DONE").length;
  const linkedTasks = tasks.filter(t => getTaskRelations(t).length > 0).length;
  const relationFilterLabel =
    relationEntityType && relationEntityId
      ? TASK_RELATION_LABELS[relationEntityType] || "Связь"
      : null;

  return (
    <div className="flex min-h-0 flex-col lg:h-full">
      {/* Compact header row — stats + smart controls */}
      <div className="space-y-3 px-4 pb-3 pt-4 sm:px-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0 mr-auto">
            <p className="text-sm font-semibold">Командный поток</p>
            <p className="text-xs text-muted-foreground">
              {relationFilterLabel
                ? `Показаны задачи по связи: ${relationFilterLabel}`
                : "Задачи, связи и ответственные в одном живом потоке."}
            </p>
          </div>
          {overdue > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-400 px-2 py-1 rounded-xl font-medium border border-red-500/20">
              <AlertTriangle className="w-3 h-3" /> {overdue} просрочено
            </span>
          )}
          {urgent > 0 && (
            <span className="flex items-center gap-1 text-xs bg-orange-500/15 text-orange-400 px-2 py-1 rounded-xl font-medium border border-orange-500/20">
              <Flame className="w-3 h-3" /> {urgent} срочных
            </span>
          )}
          {inProgress > 0 && (
            <span className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 px-2 py-1 rounded-xl font-medium border border-amber-500/20">
              <RefreshCw className="w-3 h-3" /> {inProgress} в работе
            </span>
          )}
          {unassigned > 0 && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-xl font-medium border border-primary/20">
              <User className="w-3 h-3" /> {unassigned} без исполнителя
            </span>
          )}
          <span className="flex items-center gap-1 text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-xl font-medium border border-border">
            <LinkIcon className="w-3 h-3" /> {linkedTasks} со связями
          </span>
          <button
            type="button"
            onClick={() => refreshTasks(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Обновить
          </button>
          <Link
            href="/admin/workflows"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Автоворкфлоу
          </Link>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_160px_220px]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти задачу, заказ, тег или исполнителя..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "")}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Все приоритеты</option>
            {Object.entries(PRIORITY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Вся команда</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.name ?? member.email}</option>
            ))}
          </select>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
          {COLUMNS.map((col) => {
            const count = tasksByStatus(col.id).length;
            const active = col.id === mobileStatus;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setMobileStatus(col.id)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <col.icon className="h-3.5 w-3.5" />
                {col.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {boardError && (
        <div className="mx-6 mb-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {boardError}
        </div>
      )}

      {/* Board */}
      <div className="p-3 sm:p-5 lg:flex-1 lg:overflow-y-auto lg:overflow-x-auto lg:p-6">
        <div className="lg:hidden">
          <Column
            col={activeMobileColumn}
            tasks={tasksByStatus(activeMobileColumn.id)}
            staff={staff}
            onAddTask={t => setTasks(prev => [...prev, t])}
            onOpenTask={setOpenTask}
            dragging={dragging}
            dragOver={dragOver === activeMobileColumn.id ? activeMobileColumn.id : null}
            onDragStart={id => setDragging(id)}
            onDragOver={status => setDragOver(status)}
            onDragEnd={() => setDragOver(null)}
            onDrop={handleDrop}
            compact
          />
        </div>

        <div className="hidden gap-4 lg:flex lg:min-w-max">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              tasks={tasksByStatus(col.id)}
              staff={staff}
              onAddTask={t => setTasks(prev => [...prev, t])}
              onOpenTask={setOpenTask}
              dragging={dragging}
              dragOver={dragOver === col.id ? col.id : null}
              onDragStart={id => setDragging(id)}
              onDragOver={status => setDragOver(status)}
              onDragEnd={() => setDragOver(null)}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      {/* Task detail modal */}
      {openTask && (
        <TaskModal
          task={openTask}
          staff={staff}
          onClose={() => setOpenTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={() => { handleDeleteTask(openTask.id); setOpenTask(null); }}
        />
      )}
    </div>
  );
}
