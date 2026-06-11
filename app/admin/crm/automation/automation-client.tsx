"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, Zap, FileText, BarChart3, Plus, Power,
  Trash2, Clock, CheckCircle2, XCircle,
  AlertTriangle, Loader2, RefreshCw,
  Send, Mail, Bell, ArrowRight, Target, Users, Globe,
  Sparkles, TrendingUp, Activity, Filter,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminModal } from "@/components/admin/admin-modal";
import { Switch } from "@/components/ui/switch";

// ─── Типы ────────────────────────────────────────────────────────────────────

type Workflow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  trigger: string;
  conditions: Record<string, any>;
  actions: Array<{ type: string; [k: string]: any }>;
  category: string;
  delayMinutes: number | null;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
  logs?: Array<{ id: string; result: string; createdAt: string; error: string | null }>;
  _count?: { logs: number };
};

type WorkflowLog = {
  id: string;
  workflowId: string;
  trigger: string;
  result: string;
  error: string | null;
  createdAt: string;
  workflow: { name: string; trigger: string; category: string };
};

type Stats = {
  total: number;
  active: number;
  logsToday: number;
  errorsToday: number;
};

function getApiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  return fallback;
}

type Tab = "robots" | "tunnels" | "documents" | "reports" | "dashboard";

const TABS: { key: Tab; label: string; icon: typeof Bot }[] = [
  { key: "robots", label: "Правила", icon: Bot },
  { key: "tunnels", label: "Цепочки", icon: Target },
  { key: "documents", label: "Документы", icon: FileText },
  { key: "reports", label: "Отчёты", icon: BarChart3 },
  { key: "dashboard", label: "Обзор", icon: Activity },
];

const TRIGGER_LABELS: Record<string, string> = {
  order_created: "Новый заказ",
  order_status_changed: "Смена статуса заказа",
  lead_created: "Новый лид",
  lead_stage_changed: "Смена этапа лида",
  lead_assigned: "Лид назначен",
  lead_inactive: "Лид неактивен",
  task_overdue: "Задача просрочена",
  task_completed: "Задача завершена",
  document_generated: "Документ создан",
  manual: "Вручную",
  timer: "По таймеру",
};

const ACTION_LABELS: Record<string, { label: string; icon: typeof Send; color: string }> = {
  create_task: { label: "Создать задачу", icon: CheckCircle2, color: "text-primary/70" },
  send_telegram: { label: "Сообщение в Telegram", icon: Send, color: "text-primary/70" },
  send_email: { label: "Письмо на почту", icon: Mail, color: "text-primary/70" },
  send_push: { label: "Уведомление", icon: Bell, color: "text-primary/70" },
  update_lead_stage: { label: "Сменить этап", icon: ArrowRight, color: "text-primary/70" },
  update_order_status: { label: "Сменить статус", icon: RefreshCw, color: "text-primary/70" },
  assign_lead: { label: "Назначить", icon: Users, color: "text-primary/70" },
  generate_document: { label: "Документ", icon: FileText, color: "text-primary/70" },
  webhook: { label: "Внешний сервис", icon: Globe, color: "text-primary/70" },
  create_notification: { label: "Уведомление", icon: Bell, color: "text-primary/70" },
};

const QUICK_SCENARIOS = [
  {
    title: "Новая заявка",
    text: "Сразу поставить задачу менеджеру и не потерять входящий запрос.",
    icon: Target,
  },
  {
    title: "Заказ пошёл в работу",
    text: "Передать следующий шаг складу или доставке без ручного напоминания.",
    icon: CheckCircle2,
  },
  {
    title: "Клиент давно ждёт",
    text: "Подсветить заявку и попросить ответственного связаться с клиентом.",
    icon: Clock,
  },
];

// ─── Компонент ───────────────────────────────────────────────────────────────

export function AutomationClient() {
  const [tab, setTab] = useState<Tab>("robots");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, logsToday: 0, errorsToday: 0 });
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Workflow | null>(null);
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Загрузка данных ──
  const fetchWorkflows = useCallback(async () => {
    try {
      setError(null);
      const wfRes = await fetch("/api/admin/crm/workflows?stats=true");
      const wfData = await wfRes.json().catch(() => null);
      if (!wfRes.ok) throw new Error(getApiError(wfData, "Не удалось загрузить автоматизации."));

      setWorkflows(Array.isArray(wfData?.workflows) ? wfData.workflows : []);
      setStats(wfData.stats || { total: 0, active: 0, logsToday: 0, errorsToday: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить автоматизации.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      setError(null);
      const logRes = await fetch("/api/admin/crm/workflows/logs?limit=30");
      const logData = await logRes.json().catch(() => null);
      if (!logRes.ok) throw new Error(getApiError(logData, "Не удалось загрузить журнал действий."));

      setLogs(Array.isArray(logData?.logs) ? logData.logs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить журнал действий.");
    } finally {
      setLogsLoaded(true);
      setLogsLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([fetchWorkflows(), fetchLogs()]);
  }, [fetchLogs, fetchWorkflows]);

  useEffect(() => { void fetchWorkflows(); }, [fetchWorkflows]);

  useEffect(() => {
    if (tab === "dashboard" && !logsLoaded && !logsLoading) {
      void fetchLogs();
    }
  }, [fetchLogs, logsLoaded, logsLoading, tab]);

  // ─── Toggle workflow ──
  const toggleWorkflow = async (wf: Workflow) => {
    setToggling(wf.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/workflows/${wf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !wf.active }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getApiError(data, "Не удалось изменить статус правила."));
      setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, active: !w.active } : w));
      setStats(prev => ({
        ...prev,
        active: prev.active + (wf.active ? -1 : 1),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить статус правила.");
    } finally {
      setToggling(null);
    }
  };

  // ─── Delete workflow ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/workflows/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getApiError(data, "Не удалось удалить правило."));
      }
      setWorkflows(prev => prev.filter(w => w.id !== deleteTarget.id));
      setDeleteTarget(null);
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        active: prev.active - (deleteTarget.active ? 1 : 0),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить правило.");
    }
  };

  // ─── Apply preset ──
  const applyPreset = async () => {
    setApplyingPreset(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/crm/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyPreset: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(getApiError(data, "Не удалось применить шаблон."));
      setPresetConfirmOpen(false);
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось применить шаблон.");
    } finally {
      setApplyingPreset(false);
    }
  };

  // ─── Фильтрованные данные ──
  const robots = workflows.filter(w => w.category === "robot");
  const tunnels = workflows.filter(w => w.category === "tunnel");

  // ─── Рендер ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="rounded-2xl border border-border bg-card/70 p-2 sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted/45 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex min-h-11 flex-none items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-primary/[0.05] hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
          <button
            onClick={() => setPresetConfirmOpen(true)}
            disabled={applyingPreset}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/15 px-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/[0.05] disabled:opacity-50 sm:w-auto"
          >
            {applyingPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
            Применить шаблон «Пиломатериалы»
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Новое правило
          </button>
        </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="arayglass-grid-metrics">
        <StatCard icon={Bot} label="Всего правил" value={stats.total} />
        <StatCard icon={Power} label="Активных" value={stats.active} />
        <StatCard icon={Activity} label="Сработало за сутки" value={stats.logsToday} />
        <StatCard icon={AlertTriangle} label="Ошибки за сутки" value={stats.errorsToday} color={stats.errorsToday > 0 ? "text-destructive" : undefined} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {QUICK_SCENARIOS.map((scenario) => (
          <button
            key={scenario.title}
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-2xl border border-border bg-card/70 p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.04]"
          >
            <scenario.icon className="mb-3 h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">{scenario.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{scenario.text}</p>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <AutomationLoadingState />
      ) : (
        <>
          {tab === "robots" && (
            <WorkflowList
              items={robots}
              emptyText="Нет правил"
              emptySubtext="Нажмите «Применить шаблон», чтобы добавить готовые действия для пиломатериалов"
              onToggle={setToggleTarget}
              onDelete={setDeleteTarget}
              toggling={toggling}
            />
          )}

          {tab === "tunnels" && (
            <WorkflowList
              items={tunnels}
              emptyText="Нет цепочек"
              emptySubtext="Цепочка помогает не забыть следующий шаг, когда лид меняет этап"
              onToggle={setToggleTarget}
              onDelete={setDeleteTarget}
              toggling={toggling}
            />
          )}

          {tab === "documents" && <DocumentsTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "dashboard" && (
            <DashboardTab
              logs={logs}
              logsLoading={logsLoading}
              workflows={workflows}
              stats={stats}
              onRefresh={refreshDashboard}
            />
          )}
        </>
      )}

      {/* Create workflow popup */}
      {showCreate && (
        <CreateWorkflowPopup
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void fetchWorkflows(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
        title="Удалить правило?"
          description={`«${deleteTarget.name}» будет удалён безвозвратно`}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}

      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.active ? "Отключить правило?" : "Включить правило?"}
          description={`«${toggleTarget.name}» ${toggleTarget.active ? "перестанет выполнять действия по будущим событиям" : "начнет выполнять действия по будущим событиям"}.`}
          confirmLabel={toggleTarget.active ? "Отключить" : "Включить"}
          variant="warning"
          loading={toggling === toggleTarget.id}
          onConfirm={() => { void toggleWorkflow(toggleTarget).then(() => setToggleTarget(null)); }}
          onClose={() => setToggleTarget(null)}
        />
      )}

      {presetConfirmOpen && (
        <ConfirmDialog
          title="Применить шаблон автоматизации?"
          description="Будут созданы недостающие правила для пиломатериалов. Новые правила появятся выключенными, их можно включить отдельно после проверки."
          confirmLabel="Применить"
          variant="warning"
          loading={applyingPreset}
          onConfirm={applyPreset}
          onClose={() => setPresetConfirmOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Bot; label: string; value: number; color?: string }) {
  return (
    <div className="arayglass arayglass-shimmer p-5 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="arayglass-value font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
        <Icon className={`arayglass-icon w-8 h-8 ${color || "text-primary/40"}`} />
      </div>
    </div>
  );
}

function AutomationLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="arayglass rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-14 shrink-0 animate-pulse rounded-full bg-primary/10" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-primary/10" />
              <div className="h-3 w-full max-w-md animate-pulse rounded bg-muted/60" />
              <div className="flex flex-wrap gap-2">
                <div className="h-7 w-24 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-7 w-28 animate-pulse rounded-lg bg-muted/60" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Workflow List ────────────────────────────────────────────────────────────

function WorkflowList({
  items, emptyText, emptySubtext, onToggle, onDelete, toggling,
}: {
  items: Workflow[];
  emptyText: string;
  emptySubtext: string;
  onToggle: (w: Workflow) => void;
  onDelete: (w: Workflow) => void;
  toggling: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="arayglass rounded-2xl p-8 text-center sm:p-12">
        <Bot className="w-12 h-12 text-primary/20 mx-auto mb-3" />
        <p className="text-foreground font-medium">{emptyText}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{emptySubtext}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(wf => (
        <div
          key={wf.id}
          className={`arayglass arayglass-shimmer rounded-2xl p-4 transition-opacity sm:p-5 ${
            !wf.active ? "opacity-60" : ""
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            {/* Toggle */}
            <Switch
              checked={wf.active}
              aria-label={wf.active ? "Отключить правило" : "Включить правило"}
              onCheckedChange={() => onToggle(wf)}
              disabled={toggling === wf.id}
              className="mt-1"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{wf.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {TRIGGER_LABELS[wf.trigger] || wf.trigger}
                </span>
              </div>
              {wf.description && (
                <p className="text-sm text-muted-foreground mt-1">{wf.description}</p>
              )}

              {/* Actions chain */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {(wf.actions as Array<{ type: string }>).map((a, i) => {
                  const info = ACTION_LABELS[a.type];
                  if (!info) return null;
                  const Icon = info.icon;
                  return (
                    <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-muted/50">
                      <Icon className={`w-3 h-3 ${info.color}`} />
                      {info.label}
                    </span>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Сработал {wf.executionCount}×
                </span>
                {wf.lastExecutedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(wf.lastExecutedAt).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {wf.delayMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Задержка {wf.delayMinutes} мин
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <button
              aria-label="Удалить правило"
              onClick={() => onDelete(wf)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-400/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Documents Tab ───────────────────────────────────────────────────────────

function DocumentsTab() {
  const DOC_TYPES = [
    { type: "KP", label: "Коммерческое предложение", icon: FileText },
    { type: "CONTRACT", label: "Договор", icon: FileText },
    { type: "INVOICE", label: "Счёт", icon: FileText },
    { type: "ACT", label: "Акт", icon: FileText },
    { type: "UPD", label: "УПД", icon: FileText },
  ];
  const DOC_FIELDS = [
    "Имя клиента",
    "Телефон клиента",
    "Почта клиента",
    "Адрес доставки",
    "Номер заказа",
    "Дата заказа",
    "Сумма заказа",
    "Стоимость доставки",
    "Состав заказа",
    "Название компании",
    "ИНН компании",
    "КПП компании",
    "Банк",
    "БИК",
    "Расчётный счёт",
    "Менеджер",
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Шаблоны документов с автозаполнением из данных заказов и лидов
        </p>
        <span className="inline-flex min-h-9 items-center rounded-xl border border-primary/15 px-3 text-xs font-medium text-muted-foreground">
          Редактор шаблонов в подготовке
        </span>
      </div>

      <div className="arayglass-grid-cards">
        {DOC_TYPES.map(dt => (
          <div key={dt.type} className="arayglass arayglass-shimmer rounded-2xl p-6 text-center">
            <dt.icon className="mx-auto mb-3 h-10 w-10 text-primary/60" />
            <h3 className="font-semibold text-foreground">{dt.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">Нет шаблонов</p>
            <span className="mt-4 inline-flex rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              Шаблон не настроен
            </span>
          </div>
        ))}
      </div>

      <div className="arayglass rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-2">Поля для автозаполнения</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Эти данные будут подставляться из заказа или лида.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {DOC_FIELDS.map(v => (
            <span key={v} className="rounded-lg bg-muted/50 px-2 py-1.5 text-muted-foreground">
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────

function ReportsTab() {
  const REPORT_TYPES = [
    { key: "daily", label: "Ежедневная сводка", desc: "Заказы, выручка, лиды за день", icon: BarChart3 },
    { key: "weekly", label: "Еженедельная сводка", desc: "Конверсия воронки, топ менеджеры", icon: TrendingUp },
    { key: "monthly", label: "Месячный отчёт", desc: "Полная аналитика за месяц", icon: BarChart3 },
    { key: "custom", label: "Свободный отчёт", desc: "Выбрать период и фильтры вручную", icon: Filter },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Автоматические и ручные отчёты с выгрузкой в файл
        </p>
        <span className="inline-flex min-h-9 items-center rounded-xl border border-primary/15 px-3 text-xs font-medium text-muted-foreground">
          Рассылки подключаются после отчётов
        </span>
      </div>

      <div className="arayglass-grid-actions">
        {REPORT_TYPES.map(rt => (
          <div key={rt.key} className="arayglass arayglass-shimmer rounded-2xl p-6">
            <rt.icon className="mb-3 h-8 w-8 text-primary/60" />
            <h3 className="font-semibold text-foreground">{rt.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{rt.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                Просмотр после настройки
              </span>
              <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                Экспорт не активирован
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Tab (Панель управления CRM) ──────────────────────────────────

function DashboardTab({
  logs, logsLoading, workflows, stats, onRefresh,
}: {
  logs: WorkflowLog[];
  logsLoading: boolean;
  workflows: Workflow[];
  stats: Stats;
  onRefresh: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Здесь видно, что включено, что недавно сработало и где нужна проверка.
        </p>
        <button
          onClick={onRefresh}
          disabled={logsLoading}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/15 px-4 text-sm transition-colors hover:bg-primary/[0.05] disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} /> Обновить
        </button>
      </div>

      {/* Active workflows summary */}
      <div className="arayglass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-primary/10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Активные правила ({stats.active})
          </h3>
        </div>
        {workflows.filter(w => w.active).length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Нет активных правил. Нажмите «Применить шаблон» на вкладке «Правила».
          </div>
        ) : (
          <div className="divide-y divide-primary/[0.05]">
            {workflows.filter(w => w.active).map(wf => (
              <div key={wf.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRIGGER_LABELS[wf.trigger] || wf.trigger} · {wf.executionCount}× сработал
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                  {wf.category === "robot" ? "Правило" : "Цепочка"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent logs */}
      <div className="arayglass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-primary/10 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Последние действия
          </h3>
          <span className="text-xs text-muted-foreground">
            {stats.logsToday} за сутки
            {stats.errorsToday > 0 && (
              <span className="text-red-400 ml-2">{stats.errorsToday} ошибок</span>
            )}
          </span>
        </div>
        {logsLoading ? (
          <div className="divide-y divide-primary/[0.05]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-5 py-3">
                <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-primary/15" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-primary/10" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Пока нет записей. Правила начнут записывать свои действия после срабатывания.
          </div>
        ) : (
          <div className="divide-y divide-primary/[0.05] max-h-[400px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                {log.result === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : log.result === "delayed" ? (
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {log.workflow?.name || "—"}
                  </p>
                  {log.error && (
                    <p className="text-xs text-red-400 truncate">{log.error}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("ru", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Workflow Popup ───────────────────────────────────────────────────

function CreateWorkflowPopup({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("order_created");
  const [category, setCategory] = useState("robot");
  const [saving, setSaving] = useState(false);
  const [actions, setActions] = useState<string[]>(["create_task"]);
  const [error, setError] = useState<string | null>(null);

  const addAction = (type: string) => {
    if (!actions.includes(type)) setActions([...actions, type]);
  };
  const removeAction = (type: string) => {
    setActions(actions.filter(a => a !== type));
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/crm/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          trigger,
          category,
          actions: actions.map(type => ({ type })),
          conditions: {},
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(getApiError(data, "Не удалось создать правило."));
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать правило.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Новое автодействие"
      subtitle="Когда что-то произошло, система сама сделает нужный шаг"
      size="lg"
      bodyClassName="space-y-5 p-4 sm:p-5"
      footer={(
        <>
          <button onClick={onClose} className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground">
            Отмена
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Создать
          </button>
        </>
      )}
    >
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground">Название</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Новый заказ → Задача менеджеру"
                className="w-full mt-1.5 px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground">Описание</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Что должно сделать это правило?"
                rows={2}
                className="w-full mt-1.5 px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-foreground">Тип</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {[
                  { key: "robot", label: "Правило", icon: Bot },
                  { key: "tunnel", label: "Цепочка", icon: Target },
                ].map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 text-sm font-medium transition-colors ${
                      category === c.key
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <c.icon className="w-4 h-4" />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger */}
            <div>
              <label className="text-sm font-medium text-foreground">Когда срабатывает</label>
              <select
                value={trigger}
                onChange={e => setTrigger(e.target.value)}
                className="w-full mt-1.5 px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div>
              <label className="text-sm font-medium text-foreground">Действия</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(ACTION_LABELS).map(([key, info]) => {
                  const isSelected = actions.includes(key);
                  const Icon = info.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => isSelected ? removeAction(key) : addAction(key)}
                    className={`flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-3 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? info.color : ""}`} />
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>
    </AdminModal>
  );
}
