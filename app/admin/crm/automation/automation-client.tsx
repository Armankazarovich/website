"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, Zap, FileText, BarChart3, Settings2, Plus, Power, PowerOff,
  Trash2, Pencil, ChevronRight, Clock, CheckCircle2, XCircle,
  AlertTriangle, Loader2, RefreshCw, Download, Play, Pause,
  Send, Mail, Bell, ArrowRight, Target, Users, Globe,
  Sparkles, Eye, TrendingUp, Activity, X, Filter,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

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

type Tab = "robots" | "tunnels" | "documents" | "reports" | "dashboard";

const TABS: { key: Tab; label: string; icon: typeof Bot }[] = [
  { key: "robots", label: "Роботы", icon: Bot },
  { key: "tunnels", label: "Тоннели", icon: Target },
  { key: "documents", label: "Документы", icon: FileText },
  { key: "reports", label: "Отчёты", icon: BarChart3 },
  { key: "dashboard", label: "Панель", icon: Activity },
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
  create_task: { label: "Создать задачу", icon: CheckCircle2, color: "text-blue-400" },
  send_telegram: { label: "Telegram", icon: Send, color: "text-sky-400" },
  send_email: { label: "Email", icon: Mail, color: "text-violet-400" },
  send_push: { label: "Push", icon: Bell, color: "text-amber-400" },
  update_lead_stage: { label: "Сменить этап", icon: ArrowRight, color: "text-emerald-400" },
  update_order_status: { label: "Сменить статус", icon: RefreshCw, color: "text-cyan-400" },
  assign_lead: { label: "Назначить", icon: Users, color: "text-purple-400" },
  generate_document: { label: "Документ", icon: FileText, color: "text-orange-400" },
  webhook: { label: "Webhook", icon: Globe, color: "text-rose-400" },
  create_notification: { label: "Уведомление", icon: Bell, color: "text-yellow-400" },
};

// ─── Компонент ───────────────────────────────────────────────────────────────

export function AutomationClient() {
  const [tab, setTab] = useState<Tab>("robots");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, logsToday: 0, errorsToday: 0 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // ─── Загрузка данных ──
  const fetchData = useCallback(async () => {
    try {
      const [wfRes, logRes] = await Promise.all([
        fetch("/api/admin/crm/workflows?stats=true"),
        fetch("/api/admin/crm/workflows/logs?limit=50"),
      ]);
      const wfData = await wfRes.json();
      const logData = await logRes.json();

      setWorkflows(wfData.workflows || []);
      setStats(wfData.stats || { total: 0, active: 0, logsToday: 0, errorsToday: 0 });
      setLogs(logData.logs || []);
    } catch {
      // таблица ещё не создана
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Toggle workflow ──
  const toggleWorkflow = async (wf: Workflow) => {
    setToggling(wf.id);
    try {
      await fetch(`/api/admin/crm/workflows/${wf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !wf.active }),
      });
      setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, active: !w.active } : w));
      setStats(prev => ({
        ...prev,
        active: prev.active + (wf.active ? -1 : 1),
      }));
    } finally {
      setToggling(null);
    }
  };

  // ─── Delete workflow ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/admin/crm/workflows/${deleteTarget.id}`, { method: "DELETE" });
    setWorkflows(prev => prev.filter(w => w.id !== deleteTarget.id));
    setDeleteTarget(null);
    setStats(prev => ({
      ...prev,
      total: prev.total - 1,
      active: prev.active - (deleteTarget.active ? 1 : 0),
    }));
  };

  // ─── Apply preset ──
  const applyPreset = async () => {
    setApplyingPreset(true);
    try {
      const res = await fetch("/api/admin/crm/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyPreset: true }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchData();
      }
    } finally {
      setApplyingPreset(false);
    }
  };

  // ─── Фильтрованные данные ──
  const robots = workflows.filter(w => w.category === "robot");
  const tunnels = workflows.filter(w => w.category === "tunnel");

  // ─── Рендер ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Автоматизация</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Роботы, тоннели, документы и отчёты
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={applyPreset}
            disabled={applyingPreset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/15 text-sm font-medium text-foreground hover:bg-primary/[0.05] transition-colors disabled:opacity-50"
          >
            {applyingPreset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
            Применить шаблон «Пиломатериалы»
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Новый робот
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="arayglass-grid-metrics">
        <StatCard icon={Bot} label="Всего роботов" value={stats.total} />
        <StatCard icon={Power} label="Активных" value={stats.active} color="text-emerald-400" />
        <StatCard icon={Activity} label="Выполнено за 24ч" value={stats.logsToday} color="text-blue-400" />
        <StatCard icon={AlertTriangle} label="Ошибок за 24ч" value={stats.errorsToday} color={stats.errorsToday > 0 ? "text-red-400" : "text-muted-foreground"} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/50 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.05]"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <>
          {tab === "robots" && (
            <WorkflowList
              items={robots}
              emptyText="Нет активных роботов"
              emptySubtext="Нажмите «Применить шаблон» чтобы добавить предустановленные роботы для пиломатериалов"
              onToggle={toggleWorkflow}
              onDelete={setDeleteTarget}
              toggling={toggling}
            />
          )}

          {tab === "tunnels" && (
            <WorkflowList
              items={tunnels}
              emptyText="Нет тоннелей"
              emptySubtext="Тоннели — это автоматические цепочки действий при движении лида по воронке"
              onToggle={toggleWorkflow}
              onDelete={setDeleteTarget}
              toggling={toggling}
            />
          )}

          {tab === "documents" && <DocumentsTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "dashboard" && <DashboardTab logs={logs} workflows={workflows} stats={stats} onRefresh={fetchData} />}
        </>
      )}

      {/* Create workflow popup */}
      {showCreate && (
        <CreateWorkflowPopup
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Удалить робота?"
          description={`«${deleteTarget.name}» будет удалён безвозвратно`}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
          variant="danger"
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
      <div className="arayglass rounded-2xl p-12 text-center">
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
          className={`arayglass arayglass-shimmer rounded-2xl p-5 transition-all ${
            !wf.active ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Toggle */}
            <button
              onClick={() => onToggle(wf)}
              disabled={toggling === wf.id}
              className={`mt-0.5 shrink-0 w-10 h-6 rounded-full transition-colors relative ${
                wf.active ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  wf.active ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>

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
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Выполнен {wf.executionCount}×
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
              onClick={() => onDelete(wf)}
              className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
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
    { type: "KP", label: "Коммерческое предложение", icon: FileText, color: "text-blue-400" },
    { type: "CONTRACT", label: "Договор", icon: FileText, color: "text-violet-400" },
    { type: "INVOICE", label: "Счёт", icon: FileText, color: "text-emerald-400" },
    { type: "ACT", label: "Акт", icon: FileText, color: "text-amber-400" },
    { type: "UPD", label: "УПД", icon: FileText, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Шаблоны документов с автозаполнением из данных заказов и лидов
        </p>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Новый шаблон
        </button>
      </div>

      <div className="arayglass-grid-cards">
        {DOC_TYPES.map(dt => (
          <div key={dt.type} className="arayglass arayglass-shimmer rounded-2xl p-6 text-center">
            <dt.icon className={`w-10 h-10 mx-auto mb-3 ${dt.color}`} />
            <h3 className="font-semibold text-foreground">{dt.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">Нет шаблонов</p>
            <button className="mt-4 text-sm text-primary hover:underline">
              Создать шаблон
            </button>
          </div>
        ))}
      </div>

      <div className="arayglass rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-2">Переменные для шаблонов</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Используйте двойные фигурные скобки для автозаполнения
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            "clientName", "clientPhone", "clientEmail", "clientAddress",
            "orderNumber", "orderDate", "orderTotal", "deliveryCost",
            "items", "companyName", "companyINN", "companyKPP",
            "bankName", "bankBIK", "accountNumber", "managerName",
          ].map(v => (
            <code key={v} className="px-2 py-1.5 rounded-lg bg-muted/50 text-primary font-mono">
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────

function ReportsTab() {
  const REPORT_TYPES = [
    { key: "daily", label: "Ежедневная сводка", desc: "Заказы, выручка, лиды за день", icon: BarChart3, color: "text-blue-400" },
    { key: "weekly", label: "Еженедельный дайджест", desc: "Конверсия воронки, топ менеджеры", icon: TrendingUp, color: "text-violet-400" },
    { key: "monthly", label: "Месячный отчёт", desc: "Полная аналитика за месяц", icon: BarChart3, color: "text-emerald-400" },
    { key: "custom", label: "Произвольный отчёт", desc: "Выбрать период и фильтры вручную", icon: Filter, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Автоматические и ручные отчёты с экспортом в PDF/Excel
        </p>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Настроить рассылку
        </button>
      </div>

      <div className="arayglass-grid-actions">
        {REPORT_TYPES.map(rt => (
          <div key={rt.key} className="arayglass arayglass-shimmer rounded-2xl p-6">
            <rt.icon className={`w-8 h-8 mb-3 ${rt.color}`} />
            <h3 className="font-semibold text-foreground">{rt.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{rt.desc}</p>
            <div className="flex gap-2 mt-4">
              <button className="flex items-center gap-1 px-3 py-2 rounded-xl border border-primary/15 text-xs font-medium hover:bg-primary/[0.05] transition-colors">
                <Eye className="w-3 h-3" /> Просмотр
              </button>
              <button className="flex items-center gap-1 px-3 py-2 rounded-xl border border-primary/15 text-xs font-medium hover:bg-primary/[0.05] transition-colors">
                <Download className="w-3 h-3" /> Экспорт
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Tab (Панель управления CRM) ──────────────────────────────────

function DashboardTab({
  logs, workflows, stats, onRefresh,
}: {
  logs: WorkflowLog[];
  workflows: Workflow[];
  stats: Stats;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Все активные автоматизации, логи и статус системы в реальном времени
        </p>
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 text-sm hover:bg-primary/[0.05] transition-colors">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>

      {/* Active workflows summary */}
      <div className="arayglass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-primary/10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Активные роботы ({stats.active})
          </h3>
        </div>
        {workflows.filter(w => w.active).length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Нет активных роботов. Нажмите «Применить шаблон» на вкладке «Роботы».
          </div>
        ) : (
          <div className="divide-y divide-primary/[0.05]">
            {workflows.filter(w => w.active).map(wf => (
              <div key={wf.id} className="px-5 py-3 flex items-center justify-between hover:bg-primary/[0.04] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRIGGER_LABELS[wf.trigger] || wf.trigger} · {wf.executionCount}× выполнен
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                  {wf.category === "robot" ? "Робот" : "Тоннель"}
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
            {stats.logsToday} за 24ч
            {stats.errorsToday > 0 && (
              <span className="text-red-400 ml-2">{stats.errorsToday} ошибок</span>
            )}
          </span>
        </div>
        {logs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Пока нет записей. Роботы начнут логировать свои действия при срабатывании.
          </div>
        ) : (
          <div className="divide-y divide-primary/[0.05] max-h-[400px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-primary/[0.04] transition-colors">
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

  const addAction = (type: string) => {
    if (!actions.includes(type)) setActions([...actions, type]);
  };
  const removeAction = (type: string) => {
    setActions(actions.filter(a => a !== type));
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
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
      const data = await res.json();
      if (data.ok) onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="arayglass-popup-backdrop" onClick={onClose} />
      <div className="arayglass-popup-container">
        <div className="arayglass-popup arayglass-popup-lg" role="dialog">
          <div className="arayglass-popup-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-base">Новый робот</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/[0.05] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="arayglass-popup-body space-y-5">
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
                placeholder="Что делает этот робот?"
                rows={2}
                className="w-full mt-1.5 px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-foreground">Тип</label>
              <div className="flex gap-2 mt-1.5">
                {[
                  { key: "robot", label: "Робот", icon: Bot },
                  { key: "tunnel", label: "Тоннель", icon: Target },
                ].map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
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
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
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
          </div>

          <div className="arayglass-popup-footer flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-primary/15 text-sm hover:bg-primary/[0.05] transition-colors">
              Отмена
            </button>
            <button
              onClick={save}
              disabled={!name.trim() || saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Создать
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
