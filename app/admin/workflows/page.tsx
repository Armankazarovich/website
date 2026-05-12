"use client";

import { useState, useEffect } from "react";

import {
  Zap, Plus, Trash2, Play, Pause, ChevronRight,
  ShoppingBag, Clock, CheckSquare,
  Loader2, RefreshCw, CheckCircle2,
} from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type Workflow = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  trigger: string;
  conditions: Record<string, any>;
  actions: Array<Record<string, any>>;
  createdAt: string;
  _count?: { logs: number };
};

function isWorkflowPayload(value: unknown): value is Workflow {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Workflow).id === "string" &&
    typeof (value as Workflow).name === "string",
  );
}

function getApiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  return fallback;
}

const VISIBLE_EMOJI_PATTERN = /[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}\ufe0f]/gu;

function cleanWorkflowText(value: string | undefined | null) {
  return (value ?? "").replace(VISIBLE_EMOJI_PATTERN, "").replace(/\s{2,}/g, " ").trim();
}

const TRIGGERS: { id: string; label: string; icon: any; desc: string }[] = [
  { id: "order_created",        label: "Новый заказ",          icon: ShoppingBag, desc: "Когда клиент оформил заказ" },
  { id: "order_status_changed", label: "Статус заказа изменён", icon: RefreshCw,   desc: "Когда менеджер меняет статус" },
  { id: "task_overdue",         label: "Задача просрочена",     icon: Clock,       desc: "Когда дедлайн задачи прошёл" },
];

const ACTION_TYPES: { id: string; label: string; desc: string }[] = [
  { id: "create_task", label: "Создать задачу", desc: "Автоматически создать задачу в канбан" },
];

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUS_OPTIONS = ["BACKLOG", "TODO", "IN_PROGRESS"];
const ROLE_OPTIONS = [
  { value: "ADMIN",       label: "Администратор" },
  { value: "MANAGER",     label: "Менеджер" },
  { value: "WAREHOUSE",   label: "Склад" },
  { value: "COURIER",     label: "Курьер" },
  { value: "ACCOUNTANT",  label: "Бухгалтер" },
];

// ─── Preset Workflows ─────────────────────────────────────────────────────────
const PRESETS = [
  {
    name: "Новый заказ -> задача менеджеру",
    description: "При каждом новом заказе создаётся задача для менеджера — связаться с клиентом",
    trigger: "order_created",
    conditions: {},
    actions: [{
      type: "create_task",
      title: "Связаться с клиентом — Заказ #{{orderNumber}}",
      description: "Клиент: {{guestName}}\nТелефон: {{guestPhone}}",
      priority: "HIGH",
      status: "TODO",
      assigneeRole: "MANAGER",
      dueDateHours: 4,
      tags: ["заказ", "клиент"],
    }],
  },
  {
    name: "Крупный заказ -> срочная задача",
    description: "Заказ от 50 000 ₽ — задача помечается как срочная",
    trigger: "order_created",
    conditions: {},
    actions: [{
      type: "create_task",
      title: "Крупный заказ #{{orderNumber}} — {{guestName}}",
      description: "Сумма: {{totalAmount}} ₽\nТелефон: {{guestPhone}}",
      priority: "URGENT",
      status: "TODO",
      assigneeRole: "MANAGER",
      dueDateHours: 2,
      tags: ["VIP", "срочно"],
    }],
  },
];

function WorkflowCard({
  wf, onToggle, onDelete, busy,
}: {
  wf: Workflow;
  onToggle: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trigger = TRIGGERS.find(t => t.id === wf.trigger);
  const TriggerIcon = trigger?.icon ?? Zap;
  const workflowName = cleanWorkflowText(wf.name) || wf.name;
  const workflowDescription = cleanWorkflowText(wf.description);

  return (
    <div className={`bg-card border rounded-2xl p-5 transition-all ${wf.active ? "border-border" : "border-border/50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wf.active ? "bg-primary/10" : "bg-muted"}`}>
            <TriggerIcon className={`w-5 h-5 ${wf.active ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{workflowName}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${wf.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {wf.active ? "Активен" : "Выкл"}
              </span>
            </div>
            {workflowDescription && <p className="text-xs text-muted-foreground mt-0.5">{workflowDescription}</p>}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="font-medium">Триггер:</span> {trigger?.label ?? wf.trigger}
              </span>
              <ChevronRight className="w-3 h-3" />
              <span>{(wf.actions as any[]).length} действ.</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggle}
            disabled={busy}
            className={`p-2 rounded-xl transition-colors ${wf.active ? "bg-muted hover:bg-amber-100 dark:hover:bg-amber-950/30 text-muted-foreground hover:text-amber-600" : "bg-primary/10 hover:bg-primary/20 text-primary"}`}
            title={wf.active ? "Выключить" : "Включить"}
          >
            {wf.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        title={`Удалить сценарий?`}
        description={`Сценарий «${workflowName}» будет удалён без возможности восстановления.`}
        confirmLabel="Удалить"
        variant="danger"
      />

      {/* Actions preview */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex flex-wrap gap-2">
          {(wf.actions as any[]).map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1.5 rounded-xl">
              <CheckSquare className="w-3 h-3 text-primary" />
              <span className="font-medium">{a.type === "create_task" ? "Задача:" : a.type}</span>
              <span className="text-muted-foreground truncate max-w-[160px]">{cleanWorkflowText(String(a.title ?? ""))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Create Workflow Modal ────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (wf: Workflow) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("order_created");
  const [actions, setActions] = useState<Record<string, any>[]>([{
    type: "create_task",
    title: "Связаться с клиентом — Заказ #{{orderNumber}}",
    description: "Клиент: {{guestName}}\nТелефон: {{guestPhone}}",
    priority: "HIGH",
    status: "TODO",
    assigneeRole: "MANAGER",
    dueDateHours: 4,
    tags: [],
  }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name);
    setDescription(preset.description);
    setTrigger(preset.trigger);
    setActions(preset.actions as any);
  };

  const updateAction = (idx: number, field: string, value: any) => {
    setActions(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, trigger, conditions: {}, actions }),
      });
      const wf = await res.json().catch(() => null);
      if (!res.ok || !isWorkflowPayload(wf)) {
        throw new Error(getApiError(wf, "Не удалось создать сценарий."));
      }
      onCreated(wf);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать сценарий.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Новый сценарий продаж"
      subtitle="Шаблон CRM или ручное правило для заказов"
      size="lg"
      bodyClassName="space-y-5 p-4"
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !name.trim()}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Создать сценарий
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
          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Готовые шаблоны</p>
            <div className="grid gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(p)}
                  className="text-left p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/15 transition-all"
                >
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Или настройте вручную</p>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Название</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Новый заказ → Задача менеджеру"
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Описание (необязательно)</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Trigger */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Триггер (когда запускать)</label>
              <div className="grid grid-cols-1 gap-2">
                {TRIGGERS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTrigger(t.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${trigger === t.id ? "border-primary bg-primary/15" : "border-border hover:border-primary/40"}`}
                    >
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Действие → Создать задачу</label>
              {actions.map((action, i) => (
                <div key={i} className="bg-muted/40 rounded-2xl p-4 space-y-3 border border-border">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Заголовок задачи</label>
                    <input
                      value={action.title ?? ""}
                      onChange={e => updateAction(i, "title", e.target.value)}
                      className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="text-[10px] text-muted-foreground">Переменные: {"{{orderNumber}}"} {"{{guestName}}"} {"{{guestPhone}}"} {"{{totalAmount}}"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Описание задачи</label>
                    <textarea
                      value={action.description ?? ""}
                      onChange={e => updateAction(i, "description", e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Приоритет</label>
                      <select value={action.priority ?? "HIGH"} onChange={e => updateAction(i, "priority", e.target.value)} className="w-full text-xs border border-border rounded-xl px-2 py-1.5 bg-card focus:outline-none">
                        {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Назначить (роль)</label>
                      <select value={action.assigneeRole ?? ""} onChange={e => updateAction(i, "assigneeRole", e.target.value)} className="w-full text-xs border border-border rounded-xl px-2 py-1.5 bg-card focus:outline-none">
                        <option value="">— любой —</option>
                        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Дедлайн (часы)</label>
                      <input
                        type="number"
                        value={action.dueDateHours ?? ""}
                        onChange={e => updateAction(i, "dueDateHours", Number(e.target.value))}
                        placeholder="4"
                        className="w-full text-xs border border-border rounded-xl px-2 py-1.5 bg-card focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </AdminModal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const seedPreview = [
    { label: "Новый заказ: звонок", icon: ShoppingBag },
    { label: "Крупный заказ: срочно", icon: Zap },
    { label: "В сборке: склад", icon: CheckSquare },
    { label: "Готов: доставка", icon: CheckCircle2 },
    { label: "Счет: бухгалтер", icon: CheckSquare },
    { label: "Выполнен: отзыв", icon: CheckCircle2 },
  ];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/workflows");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getApiError(data, "Не удалось загрузить сценарии."));
      setWorkflows(Array.isArray(data?.workflows) ? data.workflows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить сценарии.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const installDefaults = async () => {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/workflows/seed", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(getApiError(data, "Не удалось установить готовые воронки."));
      setSeedDone(true);
      await load();
    } catch (err) {
      setSeedDone(false);
      setError(err instanceof Error ? err.message : "Не удалось установить готовые воронки.");
    } finally {
      setSeeding(false);
    }
  };

  const toggle = async (wf: Workflow) => {
    setMutatingId(wf.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/workflows/${wf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !wf.active }),
      });
      const updated = await res.json().catch(() => null);
      if (!res.ok || !isWorkflowPayload(updated)) {
        throw new Error(getApiError(updated, "Не удалось изменить статус сценария."));
      }
      setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить статус сценария.");
    } finally {
      setMutatingId(null);
    }
  };

  const deleteWf = async (id: string) => {
    setMutatingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/workflows/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getApiError(data, "Не удалось удалить сценарий."));
      }
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить сценарий.");
    } finally {
      setMutatingId(null);
    }
  };

  const activeCount = workflows.filter(w => w.active).length;

  return (
    <div className="admin-page-frame admin-page-frame-readable">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Сценарии продаж
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            CRM-автоматизация заказов — {activeCount} из {workflows.length} активно
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Новый сценарий
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">{workflows.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Всего правил</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold font-display text-emerald-500">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Активных</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold font-display text-amber-500">{workflows.length - activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Выключено</p>
        </div>
      </div>

      {/* ── One-click install for lumber store ── */}
      {!loading && (
        <div className={`rounded-2xl border-2 p-5 transition-all ${seedDone ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-primary/30 bg-primary/15"}`}>
          {seedDone ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">6 сценариев установлены и активны!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Теперь при каждом заказе задачи создаются автоматически</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 flex-col sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Готовые сценарии для магазина пиломатериалов
                </p>
                <p className="text-xs text-muted-foreground mt-1">Одна кнопка — и 6 сценариев сразу активны:</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {seedPreview.map(({ label, icon: Icon }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <Icon className="h-3 w-3" strokeWidth={1.8} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setConfirmSeed(true)}
                disabled={seeding}
                className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-lg shadow-primary/30 text-sm"
              >
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {seeding ? "Устанавливаем..." : "Установить всё"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Workflows */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Загрузка...</span>
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Нажмите «Установить всё» выше или создайте сценарий вручную
          </p>
          <button onClick={() => setShowCreate(true)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm hover:bg-primary/[0.08] transition-colors">
            <Plus className="w-4 h-4" />
            Создать вручную
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onToggle={() => toggle(wf)}
              onDelete={() => deleteWf(wf.id)}
              busy={mutatingId === wf.id}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={wf => setWorkflows(prev => [...prev, wf])}
        />
      )}

      <ConfirmDialog
        open={confirmSeed}
        onClose={() => setConfirmSeed(false)}
        onConfirm={() => { setConfirmSeed(false); installDefaults(); }}
        title="Установить готовые сценарии?"
        description="Установить 6 готовых сценариев для магазина пиломатериалов? Они будут сразу активны."
        confirmLabel="Установить"
        variant="default"
        loading={seeding}
      />
    </div>
  );
}
