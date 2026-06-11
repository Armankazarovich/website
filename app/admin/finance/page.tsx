"use client";

import { useAdminConfirm } from "@/components/admin/admin-confirm-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  Landmark,
  ListChecks,
  Loader2,
  LockKeyhole,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Repeat2,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  "Аренда",
  "Зарплата",
  "Транспорт",
  "Реклама",
  "Коммунальные",
  "Оборудование",
  "Материалы",
  "Налоги",
  "Прочее",
];

const PERSONAL_BUCKETS = [
  { label: "Обязательные платежи", value: 45, hint: "ЖКХ, связь, кредиты" },
  { label: "Накопления", value: 20, hint: "Резерв и цели" },
  { label: "Покупки", value: 25, hint: "Бытовые траты" },
  { label: "Обучение", value: 10, hint: "Финансовая грамотность" },
];

const BANK_ACCOUNTS = [
  {
    name: "Расчетный счет бизнеса",
    provider: "Банк не подключен",
    balance: "planned",
    status: "vendor-ready",
    note: "Готовим безопасное подключение банка. Пока баланс считаем из заказов и ручных расходов.",
  },
  {
    name: "Личный кошелек",
    provider: "Внутренний учет ARAY",
    balance: "planned",
    status: "planned",
    note: "Будет отдельный личный кошелек. Сейчас реальные личные деньги здесь не храним.",
  },
  {
    name: "Налоги и НДС",
    provider: "Ручной контроль",
    balance: "beta",
    status: "beta",
    note: "Сейчас расчет НДС справочный: бухгалтер подтверждает перед оплатой.",
  },
] as const;

const ROLE_MATRIX = [
  {
    role: "SUPER_ADMIN / ADMIN",
    access: "Полный обзор, расходы, отчеты, настройки интеграций",
    state: "beta",
  },
  {
    role: "ACCOUNTANT",
    access: "Финансы, расходы, P&L, налоговые сверки",
    state: "beta",
  },
  {
    role: "MANAGER",
    access: "Финансовый журнал закрыт; менеджер видит заказы и свою операционную сводку",
    state: "planned",
  },
  {
    role: "USER",
    access: "Личные финансы в кабинете после отдельного запуска",
    state: "planned",
  },
] as const;

type Expense = {
  id: string;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
};

type FinanceData = {
  period: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    days: number;
    updatedAt: string;
  };
  revenue: number;
  productRevenue: number;
  deliveryRevenue: number;
  completedRevenue: number;
  ordersCount: number;
  completedOrdersCount: number;
  averageOrderValue: number;
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  grossProfit: number;
  margin: number;
  vatRate: number;
  vatAmount: number;
  profitAfterVat: number;
  netMargin: number;
  expenseRatio: number;
  revenueGrowth: number | null;
  revenueByDay: Record<string, number>;
  expensesByDay: Record<string, number>;
  expenses: Expense[];
  comparison: {
    previousRevenue: number;
    previousCompletedRevenue: number;
    previousExpenses: number;
    previousGrossProfit: number;
    previousProfitAfterVat: number;
    revenueDeltaPct: number | null;
    expensesDeltaPct: number | null;
    grossProfitDeltaPct: number | null;
    profitAfterVatDeltaPct: number | null;
  };
  cashflow: {
    inflow: number;
    completedInflow: number;
    outflow: number;
    net: number;
    completedNet: number;
    pendingReceivables: number;
    averageDailyRevenue: number;
    breakEvenDaily: number;
    safeToSpend: number;
  };
  readiness: {
    score: number;
    items: Array<{
      key: string;
      label: string;
      status: "ready" | "attention" | "planned";
      text: string;
    }>;
  };
  recommendations: string[];
  dataQuality: {
    ordersCount: number;
    completedOrdersCount: number;
    expensesCount: number;
    attributedOrders: number;
    directConnected: boolean;
    metrikaConnected: boolean;
    bankConnected: boolean;
    revenueIncludesDelivery: boolean;
    source: string;
  };
  marketing: {
    sourceStats: Array<{
      group: string;
      label: string;
      orders: number;
      revenue: number;
    }>;
    manualAdvertisingExpenses: number;
    directRevenue: number;
    directRoas: number | null;
    manualAdsRoas: number | null;
    note: string;
    directSpend: {
      connected: boolean;
      available: boolean;
      checkedAt: string;
      spend: number;
      clicks: number;
      impressions: number;
      ctr: number;
      avgCpc: number;
      conversions: number;
      conversionRate: number;
      costPerConversion: number;
      sessions: number;
      bounceRate: number;
      campaigns: Array<{
        id: number;
        name: string;
        spend: number;
        clicks: number;
        impressions: number;
        ctr: number;
        avgCpc: number;
        conversions: number;
        conversionRate: number;
        costPerConversion: number;
        sessions: number;
        bounceRate: number;
      }>;
      error: string | null;
    };
    metrikaTraffic: {
      connected: boolean;
      available: boolean;
      checkedAt: string;
      counterId: number | null;
      visits: number;
      users: number;
      pageviews: number;
      bounceRate: number;
      pageDepth: number;
      avgVisitDurationSeconds: number;
      goalReaches: number;
      conversionRate: number;
      sensitiveDataLimited: boolean;
      regions: Array<{
        id: string;
        name: string;
        visits: number;
        users: number;
        goalReaches: number;
      }>;
      sources: Array<{
        id: string;
        name: string;
        visits: number;
        users: number;
        goalReaches: number;
      }>;
      error: string | null;
    };
  };
  foundation: {
    wallet: {
      status: "read-only";
      source: string;
      displayBalance: number;
      completedBalance: number;
      note: string;
    };
    piloPoints: {
      status: "planned";
      ledgerReady: boolean;
      balance: number | null;
      source: string;
      note: string;
    };
    movements: {
      status: "read-only";
      incomeCount: number;
      expenseCount: number;
      totalCount: number;
      latestAt: string | null;
      source: string;
    };
    taskOps: {
      status: "ready";
      openCount: number;
      relation: { entityType: "BUSINESS"; entityId: "finance" };
      tasks: {
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string | null;
        createdAt: string;
      }[];
    };
  };
};

type FinanceTab = "business" | "personal" | "reports" | "access";
type CopyKey = "arai" | "bank" | "report" | null;

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
    label: from.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDelta(value: number | null) {
  if (value == null) return "нет прошлого периода";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% к прошлому периоду`;
}

function formatUpdatedAt(value?: string) {
  if (!value) return "обновление не загружено";
  return `обновлено ${new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function FinancePage() {
  const confirmAction = useAdminConfirm();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<FinanceTab>("business");
  const [includeVat, setIncludeVat] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<CopyKey>(null);

  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState(formatDateInput(new Date()));

  const { from, to, label } = getMonthRange(monthOffset);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/finance?from=${from}&to=${to}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Не удалось загрузить финансы");
      }

      const json = (await res.json()) as FinanceData;
      setData(json);
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err, "Не удалось загрузить финансы"));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const profit = data
    ? includeVat
      ? data.profitAfterVat
      : data.grossProfit
    : 0;
  const margin = data ? (includeVat ? data.netMargin : data.margin) : 0;
  const cashInWork = data?.cashflow.pendingReceivables ?? 0;
  const expenseRatio = data?.expenseRatio ?? 0;
  const dailyAverage = data?.cashflow.averageDailyRevenue ?? 0;

  const araiPrompt = useMemo(() => {
    return [
      "ARAY, помоги разобрать финансы за период:",
      `Период: ${from} - ${to}`,
      `Выручка: ${formatPrice(data?.revenue ?? 0)}`,
      `Завершенная выручка: ${formatPrice(data?.completedRevenue ?? 0)}`,
      `Расходы: ${formatPrice(data?.totalExpenses ?? 0)}`,
      `Прибыль до НДС: ${formatPrice(data?.grossProfit ?? 0)}`,
      `НДС в выручке: ${formatPrice(data?.vatAmount ?? 0)}`,
      `Чистая прибыль справочно: ${formatPrice(data?.profitAfterVat ?? 0)}`,
      `Безопасно к трате по завершенным деньгам: ${formatPrice(data?.cashflow.safeToSpend ?? 0)}`,
      `Деньги в работе: ${formatPrice(data?.cashflow.pendingReceivables ?? 0)}`,
      `Финансовая готовность: ${data?.readiness.score ?? 0}%`,
      `Рекомендации системы: ${(data?.recommendations || []).join("; ") || "нет"}`,
      `Расход Direct: ${formatPrice(data?.marketing.directSpend.spend ?? 0)}`,
      `Клики Direct: ${data?.marketing.directSpend.clicks ?? 0}`,
      `CPC Direct: ${formatPrice(data?.marketing.directSpend.avgCpc ?? 0)}`,
      `Конверсии Direct: ${(data?.marketing.directSpend.conversions ?? 0).toFixed(0)}`,
      `CPA Direct: ${formatPrice(data?.marketing.directSpend.costPerConversion ?? 0)}`,
      `Выручка с Direct-меток: ${formatPrice(data?.marketing.directRevenue ?? 0)}`,
      `ROAS Direct: ${
        data?.marketing.directRoas != null
          ? `${data.marketing.directRoas.toFixed(2)}x`
          : "нет данных"
      }`,
      `Визиты Метрики: ${data?.marketing.metrikaTraffic.visits ?? 0}`,
      `Цели Метрики: ${data?.marketing.metrikaTraffic.goalReaches ?? 0}`,
      `Конверсия Метрики: ${(data?.marketing.metrikaTraffic.conversionRate ?? 0).toFixed(2)}%`,
      "",
      "Объясни как другу: где реклама окупается, где теряем деньги, какие 3 действия сделать на этой неделе. Не выдумывай спрос и не выполняй банковские, рекламные или юридические действия без подтверждения владельца.",
    ].join("\n");
  }, [data, from, to]);

  const bankWorkflow = [
    "1. Выбрать банк и способ подключения.",
    "2. Подтвердить юридическое лицо и роли сотрудников.",
    "3. Загрузить тестовую выписку без реальных платежей.",
    "4. Сверить категории, НДС и прибыль с бухгалтером.",
    "5. Только после этого включать синхронизацию.",
  ].join("\n");

  const reportSummary = useMemo(() => {
    if (!data) return "Финансовый отчет пока не загружен.";

    return [
      `Прибыль ${label}`,
      `Выручка: ${formatPrice(data.revenue)}`,
      `Завершенная выручка: ${formatPrice(data.completedRevenue)}`,
      `Расходы: ${formatPrice(data.totalExpenses)}`,
      `Прибыль до НДС: ${formatPrice(data.grossProfit)}`,
      `НДС 20% в выручке: ${formatPrice(data.vatAmount)}`,
      `Чистая прибыль справочно: ${formatPrice(data.profitAfterVat)}`,
      `Маржа: ${margin.toFixed(1)}%`,
      `Безопасно к трате: ${formatPrice(data.cashflow.safeToSpend)}`,
      `Деньги в работе: ${formatPrice(data.cashflow.pendingReceivables)}`,
      `Готовность учета: ${data.readiness.score}%`,
      `Рекомендации: ${data.recommendations.join("; ")}`,
      "Статус: работает для обзора. Перед налогами и банковскими действиями нужна проверка бухгалтером.",
    ].join("\n");
  }, [data, label, margin]);

  async function copyText(key: Exclude<CopyKey, null>, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  }

  function askAray() {
    window.dispatchEvent(
      new CustomEvent("aray:prompt", { detail: { text: araiPrompt } }),
    );
    window.dispatchEvent(new Event("aray:open"));
  }

  async function addExpense() {
    const amount = Number(newAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!(await confirmAction("Добавить расход в финансовый учет?"))) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          category: newCategory,
          description: newDesc.trim() || undefined,
          date: newDate,
          confirm: true,
        }),
      });

      if (!res.ok) throw new Error("Не удалось сохранить расход");

      setNewAmount("");
      setNewDesc("");
      setNewDate(formatDateInput(new Date()));
      setShowAddExpense(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось сохранить расход"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense() {
    if (!confirmDeleteId) return;

    setDeleting(confirmDeleteId);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/finance/expenses?id=${confirmDeleteId}&confirm=true`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Не удалось удалить расход");

      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось удалить расход"));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="admin-page-frame admin-page-frame-fluid space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">Финансы</h1>
              <StatusBadge state="beta" label="работает" />
              <StatusBadge state="planned" label="банк готовим" />
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Простая картина денег: сколько пришло из заказов, сколько внесли расходов,
              какая прибыль и что пока нельзя делать как реальную банковскую операцию.
              {data ? ` ${formatUpdatedAt(data.period.updatedAt)}.` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMonthOffset((value) => value - 1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-muted/40"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="inline-flex h-11 min-w-[168px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium capitalize">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {label}
            </div>
            <button
              type="button"
              onClick={() => setMonthOffset((value) => value + 1)}
              disabled={monthOffset >= 0}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-muted/40 disabled:opacity-60"
              aria-label="Обновить финансы"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </header>

        {error && (
          <div className="admin-alert admin-alert-danger flex items-start gap-3 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Главное за месяц
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                    {loading ? "—" : formatPrice(Math.max(profit, 0))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {includeVat ? "Чистая прибыль справочно" : "Прибыль до НДС"}{" "}
                    · маржа {margin.toFixed(1)}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeVat((value) => !value)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-medium hover:bg-muted/40"
                  aria-pressed={includeVat}
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  {includeVat ? "С учетом НДС" : "До НДС"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <WalletMetric
                  icon={ArrowUpRight}
                  label="Выручка"
                  value={data?.revenue ?? 0}
                  loading={loading}
                  sub={data ? formatDelta(data.comparison.revenueDeltaPct) : ""}
                />
                <WalletMetric
                  icon={BadgeCheck}
                  label="Завершено"
                  value={data?.completedRevenue ?? 0}
                  loading={loading}
                  sub={`${data?.completedOrdersCount ?? 0} закрытых заказов`}
                />
                <WalletMetric
                  icon={ArrowDownRight}
                  label="Расходы"
                  value={data?.totalExpenses ?? 0}
                  loading={loading}
                  tone="danger"
                  sub={data ? formatDelta(data.comparison.expensesDeltaPct) : ""}
                />
                <WalletMetric
                  icon={Banknote}
                  label="В работе"
                  value={cashInWork}
                  loading={loading}
                  tone="muted"
                  sub="выручка не завершена"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {BANK_ACCOUNTS.map((account) => (
                <BankAccountCard key={account.name} account={account} />
              ))}
            </div>
          </div>
        </section>

        <FinanceReadinessPanel data={data} loading={loading} />

        <FinanceFoundation data={data} loading={loading} />

        <MarketingFinancePanel
          data={data}
          loading={loading}
          onAskAray={askAray}
        />

        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1">
          {[
            { id: "business", label: "Бизнес", icon: BriefcaseBusiness },
            { id: "personal", label: "Личные", icon: UserRound },
            { id: "reports", label: "Отчеты", icon: FileText },
            { id: "access", label: "Доступы", icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FinanceTab)}
              className={cn(
                "inline-flex min-h-10 flex-none items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "business" && (
          <BusinessFinance
            data={data}
            loading={loading}
            expenseRatio={expenseRatio}
            dailyAverage={dailyAverage}
            showAddExpense={showAddExpense}
            setShowAddExpense={setShowAddExpense}
            newAmount={newAmount}
            setNewAmount={setNewAmount}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            newDesc={newDesc}
            setNewDesc={setNewDesc}
            newDate={newDate}
            setNewDate={setNewDate}
            saving={saving}
            addExpense={addExpense}
            deleting={deleting}
            setConfirmDeleteId={setConfirmDeleteId}
          />
        )}

        {activeTab === "personal" && (
          <PersonalFinance
            copiedKey={copiedKey}
            onCopy={() => copyText("arai", araiPrompt)}
          />
        )}

        {activeTab === "reports" && (
          <ReportsFinance
            data={data}
            label={label}
            reportSummary={reportSummary}
            bankWorkflow={bankWorkflow}
            copiedKey={copiedKey}
            onCopyReport={() => copyText("report", reportSummary)}
            onCopyBank={() => copyText("bank", bankWorkflow)}
          />
        )}

        {activeTab === "access" && <AccessFinance />}

        <ARAYFinancePanel
          prompt={araiPrompt}
          copied={copiedKey === "arai"}
          onCopy={() => copyText("arai", araiPrompt)}
          onAsk={askAray}
        />

        <section className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground sm:p-5">
          <div className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Деньги, банки, налоги и юридические действия здесь разделены на
              понятные уровни. Сейчас работают выручка из заказов и ручные
              расходы; банк, личный кошелек и автосинхронизация остаются в плане
              до реального подключения и проверки.
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={deleteExpense}
        title="Удалить расход?"
        description="Запись будет удалена из финансового учета без восстановления. Проверьте, что это не бухгалтерская корректировка."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        loading={!!deleting}
      />
    </>
  );
}

function FinanceFoundation({
  data,
  loading,
}: {
  data: FinanceData | null;
  loading: boolean;
}) {
  const foundation = data?.foundation;
  const latestMovement = foundation?.movements.latestAt
    ? new Date(foundation.movements.latestAt).toLocaleDateString("ru-RU")
    : "нет движений";
  const taskHref = "/admin/tasks?entityType=BUSINESS&entityId=finance";
  const foundationFacts = [
    {
      icon: BadgeCheck,
      label: "Источник",
      value: "заказы + ручные расходы",
    },
    {
      icon: Repeat2,
      label: "Движения",
      value: foundation
        ? `${foundation.movements.incomeCount} приходов · ${foundation.movements.expenseCount} расходов`
        : "журнал готов",
    },
    {
      icon: LockKeyhole,
      label: "Безопасность",
      value: "без автоплатежей",
    },
  ];

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">
                Рабочий финансовый контур
              </h2>
              <StatusBadge state="ready" label="учет включен" />
              <StatusBadge state="planned" label="без списаний" />
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Здесь только подтвержденные данные: реальные заказы, завершенные
              оплаты и ручные расходы. Будущие баллы, переводы, банк и налоги
              отделены, поэтому цифры можно читать спокойно и без смешивания
              с планами.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            {foundationFacts.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background/70 px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {loading ? "загружаю" : value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FoundationCard
          icon={WalletCards}
          title="Баланс"
          status={foundation?.wallet.status ?? "read-only"}
          value={
            loading
              ? "—"
              : formatPrice(foundation?.wallet.displayBalance ?? 0)
          }
          text={
            foundation?.wallet.note ??
            "Считаю из заказов и ручных расходов. Это управленческий баланс, не банковский счет."
          }
          meta={
            foundation
              ? `Завершено минус расходы: ${formatPrice(foundation.wallet.completedBalance)}`
              : "Источник: заказы и ручные расходы"
          }
          ctaHref="/admin/finance"
          ctaLabel="Смотреть прибыль"
        />

        <FoundationCard
          icon={Coins}
          title="Баллы ПилоРус"
          status={foundation?.piloPoints.status ?? "planned"}
          value={foundation?.piloPoints.balance ?? "не заведены"}
          text={
            foundation?.piloPoints.note ??
            "Нет таблиц и правил начисления внутренней монеты."
          }
          meta={foundation?.piloPoints.source ?? "Нужны правила начисления"}
          ctaHref="/admin/settings"
          ctaLabel="К настройкам"
        />

        <FoundationCard
          icon={Repeat2}
          title="Движения"
          status={foundation?.movements.status ?? "read-only"}
          value={loading ? "—" : String(foundation?.movements.totalCount ?? 0)}
          text="Показываем приходы из заказов и ручные расходы. Банковские переводы пока не выполняем."
          meta={`Последнее: ${latestMovement}`}
          ctaHref="/admin/finance"
          ctaLabel="Открыть журнал"
        />

        <FoundationCard
          icon={ListChecks}
          title="Задачи"
          status={foundation?.taskOps.status ?? "ready"}
          value={loading ? "—" : String(foundation?.taskOps.openCount ?? 0)}
          text="Все финансовые дела можно вести как задачи: проверить расход, сверить прибыль, подготовить подключение."
          meta={
            foundation?.taskOps.tasks[0]
              ? `Ближайшая: ${foundation.taskOps.tasks[0].title}`
              : "Открытых связанных задач нет"
          }
          ctaHref={taskHref}
          ctaLabel="Открыть задачи"
        />
      </div>
    </section>
  );
}

function FinanceReadinessPanel({
  data,
  loading,
}: {
  data: FinanceData | null;
  loading: boolean;
}) {
  const readiness = data?.readiness;
  const cashflow = data?.cashflow;

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">
              Финансовая готовность
            </h2>
            <StatusBadge
              state={readiness && readiness.score >= 70 ? "ready" : "beta"}
              label={loading ? "проверяю" : `${readiness?.score ?? 0}%`}
            />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Я отделяю управленческие цифры от банка и налоговых решений: показываю,
            что уже надежно, что требует ручной сверки и где данные пока неполные.
          </p>
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:w-[520px]">
          <MiniMetric
            label="Безопасно к трате"
            value={loading ? "—" : formatPrice(cashflow?.safeToSpend ?? 0)}
          />
          <MiniMetric
            label="Деньги в работе"
            value={loading ? "—" : formatPrice(cashflow?.pendingReceivables ?? 0)}
          />
          <MiniMetric
            label="Точка в день"
            value={loading ? "—" : formatPrice(cashflow?.breakEvenDaily ?? 0)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(readiness?.items || []).map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-border bg-background/70 p-3"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {item.status === "ready" ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                )}
                {item.label}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </div>
          ))}
          {!readiness && (
            <div className="rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
              {loading ? "Загружаю финансовую готовность" : "Нет данных готовности"}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-3">
          <h3 className="text-sm font-semibold">Что сделать дальше</h3>
          <div className="mt-2 space-y-2">
            {(data?.recommendations || []).map((item) => (
              <ChecklistItem key={item} text={item} />
            ))}
            {!data?.recommendations?.length && (
              <p className="text-xs text-muted-foreground">
                Рекомендации появятся после загрузки финансов.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatPercent(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "нет данных";
  return `${value.toFixed(2)}x`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 сек";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes <= 0) return `${rest} сек`;
  return `${minutes} мин ${rest} сек`;
}

function MarketingFinancePanel({
  data,
  loading,
  onAskAray,
}: {
  data: FinanceData | null;
  loading: boolean;
  onAskAray: () => void;
}) {
  const marketing = data?.marketing;
  const direct = marketing?.directSpend;
  const metrika = marketing?.metrikaTraffic;
  const directReady = Boolean(direct?.available);
  const metrikaReady = Boolean(metrika?.available);
  const topSources = (marketing?.sourceStats || []).filter(
    (source) => source.orders > 0 || source.revenue > 0,
  );
  const topRegions = metrika?.regions || [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">
              Финансы + аналитика рекламы
            </h2>
            <StatusBadge
              state={directReady || metrikaReady ? "beta" : "planned"}
              label={directReady || metrikaReady ? "считает" : "ждет подключения"}
            />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Сводим заказы, UTM, расходы Direct и Метрику в одну картину. Нет
            подключения — показываем статус и ручные расходы, без выдуманных цифр.
          </p>
        </div>
        <button
          type="button"
          onClick={onAskAray}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15"
        >
          <Sparkles className="h-4 w-4" />
          Разобрать со мной
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MarketingMetric
          label="Расход Direct"
          value={formatPrice(direct?.spend ?? 0)}
          hint={
            directReady
              ? `${direct?.clicks ?? 0} кликов · CTR ${formatPercent(direct?.ctr ?? 0)}`
              : direct?.error || "Direct OAuth не подключен"
          }
          loading={loading}
        />
        <MarketingMetric
          label="CPC / CPA"
          value={`${formatPrice(direct?.avgCpc ?? 0)} / ${formatPrice(direct?.costPerConversion ?? 0)}`}
          hint={`${direct?.conversions ?? 0} конверсий · CR ${formatPercent(direct?.conversionRate ?? 0)}`}
          loading={loading}
        />
        <MarketingMetric
          label="ROAS Direct"
          value={formatRatio(marketing?.directRoas)}
          hint={`Выручка с Direct: ${formatPrice(marketing?.directRevenue ?? 0)}`}
          loading={loading}
        />
        <MarketingMetric
          label="Метрика"
          value={`${metrika?.visits ?? 0} визитов`}
          hint={
            metrikaReady
              ? `${metrika?.goalReaches ?? 0} целей · конверсия ${formatPercent(metrika?.conversionRate ?? 0, 2)}`
              : metrika?.error || "Нужны счетчик и OAuth"
          }
          loading={loading}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Кампании Direct</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Фактический расход из Direct Reports API, если кабинет подключен.
              </p>
            </div>
            <Link
              href="/admin/promotion"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-medium hover:bg-muted/40"
            >
              <Settings className="h-3.5 w-3.5" />
              Продвижение
            </Link>
          </div>

          {directReady && direct?.campaigns.length ? (
            <div className="mt-3">
              <div className="space-y-2 lg:hidden">
                {direct.campaigns.slice(0, 4).map((campaign) => (
                  <div
                    key={`mobile-${campaign.id}-${campaign.name}`}
                    className="rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold">
                        {campaign.name}
                      </p>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {formatPrice(campaign.spend)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>
                        <b className="font-semibold text-foreground">{campaign.clicks}</b>
                        <br />
                        кликов
                      </span>
                      <span>
                        <b className="font-semibold text-foreground">{formatPrice(campaign.avgCpc)}</b>
                        <br />
                        CPC
                      </span>
                      <span>
                        <b className="font-semibold text-foreground">{formatPrice(campaign.costPerConversion)}</b>
                        <br />
                        CPA
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
              <div className="min-w-[680px] divide-y divide-border text-xs">
                <div className="grid grid-cols-[1fr_100px_80px_80px_90px_90px] gap-3 py-2 text-muted-foreground">
                  <span>Кампания</span>
                  <span className="text-right">Расход</span>
                  <span className="text-right">Клики</span>
                  <span className="text-right">CPC</span>
                  <span className="text-right">Конв.</span>
                  <span className="text-right">CPA</span>
                </div>
                {direct.campaigns.map((campaign) => (
                  <div
                    key={`${campaign.id}-${campaign.name}`}
                    className="grid grid-cols-[1fr_100px_80px_80px_90px_90px] gap-3 py-2"
                  >
                    <span className="truncate font-medium" title={campaign.name}>
                      {campaign.name}
                    </span>
                    <span className="text-right tabular-nums">
                      {formatPrice(campaign.spend)}
                    </span>
                    <span className="text-right tabular-nums">
                      {campaign.clicks}
                    </span>
                    <span className="text-right tabular-nums">
                      {formatPrice(campaign.avgCpc)}
                    </span>
                    <span className="text-right tabular-nums">
                      {campaign.conversions.toFixed(0)}
                    </span>
                    <span className="text-right tabular-nums">
                      {formatPrice(campaign.costPerConversion)}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Расход Direct пока не подтянут"
              text={
                direct?.error ||
                "Подключите Direct OAuth в продвижении, и я буду считать клики, CPC, CPA и расход автоматически."
              }
            />
          )}
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Источники заказов</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              По заказам с UTM, yclid, gclid и referrer.
            </p>
            <div className="mt-3 space-y-2">
              {topSources.length ? (
                topSources.slice(0, 6).map((source) => (
                  <div key={source.group}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium">{source.label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {source.orders} зак. · {formatPrice(source.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(
                            data && data.revenue > 0
                              ? (source.revenue / data.revenue) * 100
                              : 0,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Заказы есть, но источники пока не размечены. Direct уже
                  выгружает UTM, новые заявки начнут попадать в эту сводку.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Посещения и регионы</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Из Метрики: визиты, цели, глубина, отказы и города.
            </p>
            {metrikaReady ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MiniMetric label="Посетители" value={String(metrika?.users ?? 0)} />
                  <MiniMetric label="Просмотры" value={String(metrika?.pageviews ?? 0)} />
                  <MiniMetric
                    label="Глубина"
                    value={(metrika?.pageDepth ?? 0).toFixed(1)}
                  />
                  <MiniMetric
                    label="Отказы"
                    value={formatPercent(metrika?.bounceRate ?? 0)}
                  />
                  <MiniMetric
                    label="Время"
                    value={formatDuration(metrika?.avgVisitDurationSeconds ?? 0)}
                  />
                  <MiniMetric
                    label="Цели"
                    value={String(metrika?.goalReaches ?? 0)}
                  />
                </div>
                {topRegions.length > 0 && (
                  <div className="space-y-1.5">
                    {topRegions.slice(0, 5).map((region) => (
                      <div
                        key={`${region.id}-${region.name}`}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="truncate text-muted-foreground">
                          {region.name}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {region.visits} виз.
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {metrika?.sensitiveDataLimited && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                    Метрика скрыла часть аудиторных данных из-за приватности.
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                title="Метрика ждет подключения"
                text={
                  metrika?.error ||
                  "После OAuth и номера счетчика ARAY подтянет визиты, цели, источники и регионы."
                }
              />
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Ручные расходы категории Реклама:{" "}
        <span className="font-semibold text-foreground">
          {formatPrice(marketing?.manualAdvertisingExpenses ?? 0)}
        </span>
        . Если Direct подключен, главный расход берем из API; ручные расходы
        оставляем для других каналов и сверки.
      </p>
    </section>
  );
}

function MarketingMetric({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate font-display text-xl font-bold tabular-nums">
        {loading ? "—" : value}
      </p>
      <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
        {loading ? "Загружаю данные" : hint}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function BusinessFinance({
  data,
  loading,
  expenseRatio,
  dailyAverage,
  showAddExpense,
  setShowAddExpense,
  newAmount,
  setNewAmount,
  newCategory,
  setNewCategory,
  newDesc,
  setNewDesc,
  newDate,
  setNewDate,
  saving,
  addExpense,
  deleting,
  setConfirmDeleteId,
}: {
  data: FinanceData | null;
  loading: boolean;
  expenseRatio: number;
  dailyAverage: number;
  showAddExpense: boolean;
  setShowAddExpense: (value: boolean | ((current: boolean) => boolean)) => void;
  newAmount: string;
  setNewAmount: (value: string) => void;
  newCategory: string;
  setNewCategory: (value: string) => void;
  newDesc: string;
  setNewDesc: (value: string) => void;
  newDate: string;
  setNewDate: (value: string) => void;
  saving: boolean;
  addExpense: () => void;
  deleting: string | null;
  setConfirmDeleteId: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BriefcaseBusiness}
          label="Заказы в периоде"
          value={String(data?.ordersCount ?? 0)}
          sub={`Средний чек: ${formatPrice(data?.averageOrderValue ?? 0)}`}
          loading={loading}
        />
        <StatCard
          icon={ReceiptText}
          label="Расходная нагрузка"
          value={`${expenseRatio.toFixed(1)}%`}
          sub="Расходы / выручка"
          loading={loading}
        />
        <StatCard
          icon={BarChart3}
          label="Средний день"
          value={formatPrice(dailyAverage)}
          sub={`Точка безубытка: ${formatPrice(data?.cashflow.breakEvenDaily ?? 0)}`}
          loading={loading}
        />
        <StatCard
          icon={PiggyBank}
          label="Можно тратить"
          value={formatPrice(data?.cashflow.safeToSpend ?? 0)}
          sub="Только по завершенным деньгам"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <AdminSectionTitle
            icon={BarChart3}
            title="Движение по дням"
            subtitle="выручка и расходы"
            className="mb-4"
          />
          {data && Object.keys(data.revenueByDay).length > 0 ? (
            <RevenueChart data={data.revenueByDay} expenses={data.expensesByDay} />
          ) : (
            <EmptyState
              title="Нет выручки за период"
              text="Когда появятся заказы, график покажет движение по дням."
            />
          )}
        </Card>

        <Card>
          <AdminSectionTitle
            icon={ReceiptText}
            title="Прибыль"
            subtitle="работает"
            className="mb-4"
          />
          {data ? (
            <div className="space-y-2 text-sm">
              <MoneyRow label="Выручка" value={data.revenue} />
              <MoneyRow
                label="Товары"
                value={data.productRevenue}
                dimmed
              />
              <MoneyRow
                label="Доставка в выручке"
                value={data.deliveryRevenue}
                dimmed
              />
              <MoneyRow
                label="Завершенная выручка"
                value={data.completedRevenue}
                dimmed
              />
              <MoneyRow label="Расходы" value={-data.totalExpenses} />
              <div className="my-2 h-px bg-border" />
              <MoneyRow label="Прибыль до НДС" value={data.grossProfit} bold />
              <p className="text-xs text-muted-foreground">
                {formatDelta(data.comparison.grossProfitDeltaPct)}
              </p>
              <MoneyRow
                label="НДС 20% в выручке"
                value={-data.vatAmount}
                dimmed
              />
              <div className="my-2 h-px bg-border" />
              <MoneyRow
                label="Чистая прибыль справочно"
                value={data.profitAfterVat}
                bold
                highlight
              />
              <p className="text-xs text-muted-foreground">
                {formatDelta(data.comparison.profitAfterVatDeltaPct)}
              </p>
              {data.profitAfterVat < 0 && (
                <div className="mt-3 flex gap-2 rounded-xl border border-destructive/30 p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  Расходы и НДС выше выручки. Перед решениями проверьте
                  категории расходов и статусы заказов.
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="Прибыль не загружена"
              text="Обновите страницу или проверьте, что модуль финансов включен."
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <AdminSectionTitle
            icon={PiggyBank}
            title="Расходы по категориям"
            subtitle="beta"
            className="mb-4"
          />
          {data && Object.keys(data.expensesByCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(data.expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <CategoryRow
                    key={category}
                    label={category}
                    amount={amount}
                    total={data.totalExpenses}
                  />
                ))}
            </div>
          ) : (
            <EmptyState
              title="Расходы не добавлены"
              text="Добавьте аренду, материалы, зарплату или другую операцию вручную."
            />
          )}
        </Card>

        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <AdminSectionTitle
              icon={Trash2}
              title="Журнал расходов"
              subtitle="ручной ввод"
              className="mb-0"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddExpense((value) => !value)}
              className="min-h-11 w-full sm:w-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить расход
            </Button>
          </div>

          {showAddExpense && (
            <div className="border-b border-border bg-muted/30 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Сумма, ₽">
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(event) => setNewAmount(event.target.value)}
                    placeholder="15000"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    style={{ fontSize: 16 }}
                  />
                </Field>
                <Field label="Категория">
                  <select
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    style={{ fontSize: 16 }}
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Дата">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(event) => setNewDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    style={{ fontSize: 16 }}
                  />
                </Field>
                <Field label="Комментарий">
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(event) => setNewDesc(event.target.value)}
                    placeholder="Аренда склада"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    style={{ fontSize: 16 }}
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="sm"
                  onClick={addExpense}
                  disabled={saving || !newAmount}
                  className="min-h-11"
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-4 w-4" />
                  )}
                  {saving ? "Сохраняю" : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddExpense(false)}
                  className="min-h-11"
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}

          <div className="divide-y divide-border">
            {data?.expenses && data.expenses.length > 0 ? (
              data.expenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {expense.category}
                      </span>
                      {expense.description && (
                        <span className="truncate text-sm text-foreground">
                          {expense.description}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-destructive">
                    {formatPrice(expense.amount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(expense.id)}
                    disabled={deleting === expense.id}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive disabled:opacity-60"
                    aria-label="Удалить расход"
                  >
                    {deleting === expense.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))
            ) : (
              <EmptyState
                title="Журнал пуст"
                text="За выбранный период нет ручных расходов."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PersonalFinance({
  copiedKey,
  onCopy,
}: {
  copiedKey: CopyKey;
  onCopy: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <AdminSectionTitle
          icon={UserRound}
          title="Личные финансы"
          subtitle="в плане"
          className="mb-4"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {PERSONAL_BUCKETS.map((bucket) => (
            <div
              key={bucket.label}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{bucket.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bucket.hint}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums">
                  {bucket.value}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${bucket.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Личный контур пока не подключен к банковским счетам и не хранит
          реальные транзакции. Сейчас пользователь вручную фиксирует цели,
          ARAY объясняет бюджет, а банковская синхронизация включается только
          после отдельной модели доступа для клиента.
        </div>
      </Card>

      <Card>
        <AdminSectionTitle
          icon={Sparkles}
          title="Финграмотность"
          subtitle="через ARAY"
          className="mb-4"
        />
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Что ARAY должен делать в этом разделе:</p>
          <ChecklistItem text="объяснять прибыль, НДС, маржу и кассовый разрыв простым языком" />
          <ChecklistItem text="помогать собрать личный бюджет без доступа к реальному банку" />
          <ChecklistItem text="предлагать безопасные действия, но не проводить платежи" />
          <ChecklistItem text="помечать налоговые советы как справочные до проверки бухгалтером" />
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted/40"
        >
          {copiedKey === "arai" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copiedKey === "arai"
            ? "Промпт скопирован"
            : "Скопировать задачу для ARAY"}
        </button>
      </Card>
    </div>
  );
}

function ReportsFinance({
  data,
  label,
  reportSummary,
  bankWorkflow,
  copiedKey,
  onCopyReport,
  onCopyBank,
}: {
  data: FinanceData | null;
  label: string;
  reportSummary: string;
  bankWorkflow: string;
  copiedKey: CopyKey;
  onCopyReport: () => void;
  onCopyBank: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          title="Прибыль"
          status="beta"
          icon={ReceiptText}
          text="Выручка, расходы, НДС и прибыль из текущих заказов и ручных расходов."
        />
        <ReportCard
          title="Деньги по датам"
          status="planned"
          icon={WalletCards}
          text="Нужны банковские выписки и даты фактических оплат."
        />
        <ReportCard
          title="Налоги"
          status="beta"
          icon={Landmark}
          text="НДС справочный, без юридического автодействия."
        />
        <ReportCard
          title="Сверка банка"
          status="vendor-ready"
          icon={CreditCard}
          text="Готов простой план подключения банка."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <AdminSectionTitle
            icon={Download}
            title={`Отчет: ${label}`}
            subtitle="копируемый beta"
            className="mb-4"
          />
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            {reportSummary}
          </pre>
          <button
            type="button"
            onClick={onCopyReport}
            disabled={!data}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copiedKey === "report" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedKey === "report" ? "Отчет скопирован" : "Скопировать отчет"}
          </button>
        </Card>

        <Card>
          <AdminSectionTitle
            icon={CreditCard}
            title="Подключение банка"
            subtitle="готовим"
            className="mb-4"
          />
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            {bankWorkflow}
          </pre>
          <button
            type="button"
            onClick={onCopyBank}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted/40"
          >
            {copiedKey === "bank" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedKey === "bank"
              ? "План скопирован"
              : "Скопировать план"}
          </button>
        </Card>
      </div>
    </div>
  );
}

function AccessFinance() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <AdminSectionTitle
          icon={ShieldCheck}
          title="Роли и доступы"
          subtitle="beta"
          className="mb-4"
        />
        <div className="space-y-3">
          {ROLE_MATRIX.map((item) => (
            <div
              key={item.role}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{item.role}</h3>
                  <StatusBadge state={item.state} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.access}
                </p>
              </div>
              <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <AdminSectionTitle
          icon={LockKeyhole}
          title="Ограничения"
          subtitle="важно"
          className="mb-4"
        />
        <div className="space-y-3 text-sm text-muted-foreground">
          <ChecklistItem text="страница показывает финансы только разрешенным ролям" />
          <ChecklistItem text="редактор ролей живет в разделе команды, не здесь" />
          <ChecklistItem text="банк и платежи требуют отдельного журнала подтверждений" />
          <ChecklistItem text="USER-доступ для личных финансов нужно запускать отдельным кабинетом" />
        </div>
      </Card>
    </div>
  );
}

function ARAYFinancePanel({
  prompt,
  copied,
  onCopy,
  onAsk,
}: {
  prompt: string;
  copied: boolean;
  onCopy: () => void;
  onAsk: () => void;
}) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-semibold">
              Я как финансовый наставник
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Я могу объяснить прибыль, найти риски и предложить безопасный план.
            Автоплатежи, банковские действия и налоговые решения остаются только
            после подтверждения сотрудника.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onAsk}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15"
            >
              <Sparkles className="h-4 w-4" />
              Спросить меня
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted/40"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Промпт скопирован" : "Скопировать промпт"}
            </button>
          </div>
        </div>
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-muted-foreground">
          {prompt}
        </pre>
      </div>
    </section>
  );
}

function WalletMetric({
  icon: Icon,
  label,
  value,
  loading,
  tone = "default",
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
  tone?: "default" | "danger" | "muted";
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            tone === "danger" && "text-destructive",
            tone === "default" && "text-primary",
          )}
        />
        {label}
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-bold tabular-nums",
          tone === "danger" && "text-destructive",
        )}
      >
        {loading ? "—" : formatPrice(value)}
      </p>
      {sub && !loading && (
        <p className="mt-1 min-h-4 text-[11px] leading-snug text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}

function BankAccountCard({
  account,
}: {
  account: (typeof BANK_ACCOUNTS)[number];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{account.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {account.provider}
          </p>
        </div>
        <StatusBadge state={account.status} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {account.note}
      </p>
    </div>
  );
}

function FoundationCard({
  icon: Icon,
  title,
  status,
  value,
  text,
  meta,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ElementType;
  title: string;
  status: string;
  value: React.ReactNode;
  text: string;
  meta: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <StatusBadge state={status} />
      </div>

      <div className="mt-4 min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-2 break-words font-display text-2xl font-bold tabular-nums">
          {value}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>

      <div className="mt-auto pt-4">
        <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
          {meta}
        </p>
        <Link
          href={ctaHref}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted/40"
        >
          <Settings className="h-4 w-4" />
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate font-display text-2xl font-bold">
            {loading ? "—" : value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function CategoryRow({
  label,
  amount,
  total,
}: {
  label: string;
  amount: number;
  total: number;
}) {
  const percentage = total > 0 ? (amount / total) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">
          {formatPrice(amount)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  bold,
  dimmed,
  highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  dimmed?: boolean;
  highlight?: boolean;
}) {
  const negative = value < 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        dimmed && "opacity-70",
      )}
    >
      <span
        className={cn(
          "text-muted-foreground",
          bold && "font-medium text-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          bold && "font-bold",
          negative && "text-destructive",
          highlight && !negative && "text-primary",
        )}
      >
        {negative ? "-" : ""}
        {formatPrice(Math.abs(value))}
      </span>
    </div>
  );
}

function RevenueChart({
  data,
  expenses = {},
}: {
  data: Record<string, number>;
  expenses?: Record<string, number>;
}) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(
    ...entries.map(([, value]) => value),
    ...Object.values(expenses),
    1,
  );
  const [selectedDay, setSelectedDay] = useState(entries.at(-1)?.[0] ?? "");
  const selectedEntry =
    entries.find(([day]) => day === selectedDay) ?? entries.at(-1);
  const selectedExpense = selectedEntry ? expenses[selectedEntry[0]] || 0 : 0;

  if (entries.length <= 1) {
    const day = selectedEntry?.[0];
    const value = selectedEntry?.[1] ?? 0;

    return (
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Пока один день продаж
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Сравнение появится, когда в периоде будет несколько дней с заказами.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">
              {day ? new Date(day).toLocaleDateString("ru-RU") : "Период"}
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatPrice(value)}
            </p>
            {selectedExpense > 0 && (
              <p className="text-xs tabular-nums text-destructive">
                расходы: {formatPrice(selectedExpense)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedEntry && (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {new Date(selectedEntry[0]).toLocaleDateString("ru-RU")}:
          </span>{" "}
          <span className="font-semibold tabular-nums">
            {formatPrice(selectedEntry[1])}
          </span>
          {selectedExpense > 0 && (
            <span className="ml-2 text-destructive">
              расход {formatPrice(selectedExpense)}
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto pb-1">
        <div className="flex h-40 min-w-[640px] items-end gap-1">
          {entries.map(([day, value]) => {
            const expenseValue = expenses[day] || 0;
            const height = value === 0 ? 4 : Math.max(8, (value / max) * 132);
            const expenseHeight =
              expenseValue === 0 ? 0 : Math.max(6, (expenseValue / max) * 132);
            const active = day === selectedEntry?.[0];

            return (
              <div
                key={day}
                className="flex min-w-5 flex-1 flex-col items-center gap-1"
              >
                <button
                  type="button"
                  className="flex h-[132px] w-full items-end justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={() => setSelectedDay(day)}
                  onFocus={() => setSelectedDay(day)}
                  aria-label={`${new Date(day).toLocaleDateString("ru-RU")}: выручка ${formatPrice(value)}, расходы ${formatPrice(expenseValue)}`}
                >
                  <span
                    className={cn(
                      "block rounded-t bg-primary/75 transition-colors hover:bg-primary",
                      expenseHeight > 0 ? "w-1/2" : "w-full",
                      active && "bg-primary",
                    )}
                    style={{ height }}
                  />
                  {expenseHeight > 0 && (
                    <span
                      className={cn(
                        "block w-1/2 rounded-t bg-destructive/60 transition-colors",
                        active && "bg-destructive",
                      )}
                      style={{ height: expenseHeight }}
                    />
                  )}
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(day).getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  status,
  icon: Icon,
  text,
}: {
  title: string;
  status: "beta" | "planned" | "vendor-ready";
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <StatusBadge state={status} />
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusBadge({
  state,
  label,
}: {
  state: "beta" | "planned" | "vendor-ready" | string;
  label?: string;
}) {
  const displayLabel =
    label ??
    ({
      beta: "работает",
      planned: "в плане",
      "vendor-ready": "готовим",
      "read-only": "только просмотр",
      ready: "готово",
    }[state] ||
      state);
  const className =
    state === "beta" || state === "ready"
      ? "border-primary/30 bg-primary/10 text-primary"
      : state === "read-only"
        ? "border-border bg-muted/40 text-muted-foreground"
      : state === "vendor-ready"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
