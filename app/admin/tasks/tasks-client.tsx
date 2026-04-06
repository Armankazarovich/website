"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, X, ChevronDown, Calendar, User, Tag,
  MessageSquare, Loader2, CheckCircle2, Clock,
  AlertTriangle, Zap, MoreHorizontal, Link as LinkIcon,
  ArrowRight, Filter, Search, Bell,
  Inbox, Square, RefreshCw, Eye, Flame,
  ArrowDown, Minus, ArrowUp,
} from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

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
  comments: Comment[];
};

type Staff = { id: string; name?: string; email: string; role: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: "BACKLOG",     label: "Очередь",  icon: Inbox,        color: "text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/50" },
  { id: "TODO",        label: "Сделать",  icon: Square,       color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/40" },
  { id: "IN_PROGRESS", label: "В работе", icon: RefreshCw,    color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "REVIEW",      label: "Проверка", icon: Eye,          color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  { id: "DONE",        label: "Готово",   icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
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

  return (
    <div
      {...dragHandlers}
      onClick={onOpen}
      className={`group bg-card border border-border rounded-2xl p-3.5 cursor-pointer
        hover:border-primary/40 hover:shadow-md transition-all select-none
        ${isDragging ? "opacity-50 rotate-2 shadow-xl scale-105" : ""}
        ${task.priority === "URGENT" ? "border-l-4 border-l-red-400" : ""}
      `}
    >
      {/* Priority + order badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-bold ${pm.color}`}>
          {pm.icon} {pm.label}
        </span>
        {task.order && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">
            #{task.order.orderNumber}
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

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, status, assigneeId: assigneeId || null, dueDate: dueDate || null, tags }),
      });
      const updated = await res.json();
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", text: comment }),
      });
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setComment("");
    } finally {
      setAddingComment(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const pm = PRIORITY_META[priority];
  const due = dueDate ? formatDate(dueDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full bg-background aray-task-panel shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {task.order && (
              <Link href={`/admin/orders`} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium hover:bg-primary/20 transition-colors">
                Заказ #{task.order.orderNumber}
              </Link>
            )}
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="text-xs border border-border rounded-xl px-2 py-1 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-destructive hover:text-destructive/80 px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              Удалить
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-lg font-bold bg-transparent border-none outline-none resize-none leading-snug"
            rows={2}
            placeholder="Название задачи..."
          />

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Приоритет</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.entries(PRIORITY_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Исполнитель</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— не назначен —</option>
                {staff.map(u => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Дедлайн</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {due?.overdue && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {due.text}
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Теги</label>
              <div className="flex gap-1.5">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Добавить тег..."
                  className="flex-1 text-sm border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={addTag} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">+</button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-lg">
                      {t}
                      <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Опишите задачу подробнее..."
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Комментарии ({comments.length})
            </h3>
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {initials(c.user?.name)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{c.user?.name ?? "Система"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm bg-muted rounded-xl px-3 py-2">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), addComment())}
                placeholder="Написать комментарий... (Enter — отправить)"
                className="flex-1 text-sm border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={addComment}
                disabled={addingComment || !comment.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {addingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "→"}
              </button>
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Создано {new Date(task.createdAt).toLocaleDateString("ru-RU")}
            {task.createdBy && ` · ${task.createdBy.name}`}
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Сохранить
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete(); onClose(); }}
        title="Удалить задачу?"
        description="Задача и все её комментарии будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
      />
    </div>
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

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority, status: defaultStatus, assigneeId: assigneeId || null, dueDate: dueDate || null }),
      });
      const task = await res.json();
      onAdd(task);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border-2 border-primary/40 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
      <textarea
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submit())}
        placeholder="Название задачи..."
        rows={2}
        className="w-full text-sm font-medium bg-transparent border-none outline-none resize-none"
      />
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
        <button onClick={onClose} className="flex-1 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted transition-colors">Отмена</button>
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
}) {
  const [adding, setAdding] = useState(false);
  const isOver = dragOver === col.id;

  return (
    <div
      className={`flex flex-col min-h-[200px] w-72 shrink-0 rounded-2xl transition-all backdrop-blur-md ${col.bg} ${isOver ? "ring-2 ring-primary shadow-lg" : ""}`}
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
      <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
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
          <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
            <p className="text-xs text-muted-foreground">Нет задач</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban ───────────────────────────────────────────────────────────────
export function TasksKanban({ initialTasks, initialStaff }: { initialTasks: Task[]; initialStaff: Staff[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [staff] = useState<Staff[]>(initialStaff);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");
  const [filterAssignee, setFilterAssignee] = useState("");

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee && t.assignee?.id !== filterAssignee) return false;
    return true;
  });

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks
      .filter(t => t.status === status)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDrop = async (targetStatus: TaskStatus) => {
    if (!dragging) return;
    const task = tasks.find(t => t.id === dragging);
    if (!task || task.status === targetStatus) { setDragging(null); setDragOver(null); return; }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === dragging ? { ...t, status: targetStatus } : t));
    setDragging(null);
    setDragOver(null);

    // API call
    try {
      const res = await fetch(`/api/admin/tasks/${dragging}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === dragging ? updated : t));
    } catch {
      // Rollback
      setTasks(prev => prev.map(t => t.id === dragging ? task : t));
    }
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setOpenTask(updated);
  };

  const handleDeleteTask = async (id: string) => {
    await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Stats
  const overdue = tasks.filter(t => t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < new Date()).length;
  const urgent = tasks.filter(t => t.priority === "URGENT" && t.status !== "DONE").length;
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;

  return (
    <div className="h-full flex flex-col">
      {/* Compact header row — stats + autoworkflow link */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
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
        </div>
        <Link
          href="/admin/workflows"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors ml-auto"
        >
          <Zap className="w-3 h-3" />
          Автоворкфлоу
        </Link>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max">
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
