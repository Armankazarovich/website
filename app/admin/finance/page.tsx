"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Plus, Trash2, ReceiptText, PiggyBank, Percent,
  ChevronDown, AlertCircle, RefreshCw, Calendar, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useClassicMode } from "@/lib/use-classic-mode";

const EXPENSE_CATEGORIES = [
  "Аренда", "Зарплата", "Транспорт", "Реклама", "Коммунальные",
  "Оборудование", "Материалы", "Налоги", "Прочее",
];

type Expense = {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
};

type FinanceData = {
  period: { from: string; to: string };
  revenue: number;
  completedRevenue: number;
  ordersCount: number;
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  grossProfit: number;
  vatAmount: number;
  profitAfterVat: number;
  revenueGrowth: number | null;
  revenueByDay: Record<string, number>;
  expenses: Expense[];
};

function getMonthRange(offset = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0, 23, 59, 59);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    label: from.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
  };
}

export default function FinancePage() {
  const classic = useClassicMode();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [includeVat, setIncludeVat] = useState(false);

  // New expense form
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const { from, to, label } = getMonthRange(monthOffset);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/finance?from=${from}&to=${to}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const addExpense = async () => {
    if (!newAmount || isNaN(Number(newAmount))) return;
    setSaving(true);
    try {
      await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(newAmount),
          category: newCategory,
          description: newDesc || undefined,
          date: newDate,
        }),
      });
      setNewAmount(""); setNewDesc(""); setNewDate(new Date().toISOString().slice(0, 10));
      setShowAddExpense(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async () => {
    if (!confirmDeleteId) return;
    setDeleting(confirmDeleteId);
    try {
      await fetch(`/api/admin/finance/expenses?id=${confirmDeleteId}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      await load();
    } finally {
      setDeleting(null);
    }
  };

  const profit = data ? (includeVat ? data.profitAfterVat : data.grossProfit) : 0;
  const margin = data && data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Финансы</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Выручка, расходы и прибыль</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonthOffset((p) => p - 1)}>
            ←
          </Button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">{label}</span>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset((p) => p + 1)} disabled={monthOffset >= 0}>
            →
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            Выручка
            {data?.revenueGrowth !== null && data?.revenueGrowth !== undefined && (
              <span className={cn(
                "ml-auto text-xs font-medium",
                data.revenueGrowth >= 0 ? "text-emerald-600" : "text-red-500"
              )}>
                {data.revenueGrowth >= 0 ? "+" : ""}{data.revenueGrowth.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="font-display font-bold text-2xl text-primary">
            {loading ? "—" : formatPrice(data?.revenue ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data?.ordersCount ?? 0} заказов</p>
        </div>

        {/* Expenses */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <ReceiptText className="w-3.5 h-3.5" />
            Расходы
          </div>
          <p className="font-display font-bold text-2xl text-red-500">
            {loading ? "—" : formatPrice(data?.totalExpenses ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data?.expenses?.length ?? 0} записей</p>
        </div>

        {/* Profit */}
        <div className={cn(
          "rounded-2xl border p-4",
          profit >= 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
        )}>
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <PiggyBank className="w-3.5 h-3.5" />
            Прибыль
            <button
              onClick={() => setIncludeVat((v) => !v)}
              className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md border transition-colors"
              style={
                includeVat
                  ? {
                      backgroundColor: classic ? "hsl(var(--primary)/0.15)" : "hsl(var(--primary)/0.3)",
                      borderColor: classic ? "hsl(var(--primary)/0.3)" : "hsl(var(--primary)/0.5)",
                      color: classic ? "hsl(var(--primary))" : "hsl(var(--primary))",
                    }
                  : {
                      borderColor: classic ? "hsl(var(--border))" : "rgba(255,255,255,0.12)",
                      color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.60)",
                      background: "transparent",
                    }
              }
            >
              {includeVat ? "с НДС" : "без НДС"}
            </button>
          </div>
          <p className={cn(
            "font-display font-bold text-2xl",
            profit >= 0 ? "text-emerald-600" : "text-red-500"
          )}>
            {loading ? "—" : formatPrice(Math.abs(profit))}
            {profit < 0 && <span className="text-base font-normal ml-1">убыток</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            маржа {margin.toFixed(1)}%
          </p>
        </div>

        {/* VAT */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Percent className="w-3.5 h-3.5" />
            НДС 20%
          </div>
          <p className="font-display font-bold text-2xl text-orange-500">
            {loading ? "—" : formatPrice(data?.vatAmount ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">включён в выручку</p>
        </div>
      </div>

      {/* Revenue chart (bar) */}
      {data && Object.keys(data.revenueByDay).length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <AdminSectionTitle icon={BarChart3} title="Выручка по дням" className="mb-4" />
          <RevenueChart data={data.revenueByDay} classic={classic} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Expenses by category */}
        <div className="rounded-2xl border bg-card p-4">
          <AdminSectionTitle icon={PiggyBank} title="Расходы по категориям" className="mb-3" />
          {data && Object.keys(data.expensesByCategory).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amt]) => {
                  const percentage = (amt / (data.totalExpenses || 1)) * 100;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-28 shrink-0">{cat}</span>
                      <div
                        className="flex-1 h-2 rounded-full overflow-hidden"
                        style={{
                          backgroundColor: classic ? "hsl(var(--muted))" : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: classic ? "hsl(var(--primary))" : "hsl(var(--primary)/0.8)",
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right shrink-0">
                        {formatPrice(amt)}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">
              Расходы не добавлены
            </p>
          )}
        </div>

        {/* P&L Summary */}
        <div className="rounded-2xl border bg-card p-4">
          <AdminSectionTitle icon={ReceiptText} title="Отчёт P&L" className="mb-3" />
          {data && (
            <div className="space-y-2 text-sm">
              <Row label="Выручка" value={data.revenue} />
              <Row label="Расходы" value={-data.totalExpenses} negative />
              <div className="h-px bg-border my-2" />
              <Row label="Прибыль (до НДС)" value={data.grossProfit} bold />
              <Row label="НДС 20% в выручке" value={-data.vatAmount} negative dimmed />
              <div className="h-px bg-border my-2" />
              <Row label="Чистая прибыль" value={data.profitAfterVat} bold highlight />

              {data.profitAfterVat < 0 && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800 flex gap-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Расходы превышают выручку — убыток {formatPrice(Math.abs(data.profitAfterVat))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expenses list */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <AdminSectionTitle icon={Trash2} title="Расходы" className="mb-0" />
          <Button size="sm" onClick={() => setShowAddExpense((v) => !v)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Добавить
          </Button>
        </div>

        {/* Add form */}
        {showAddExpense && (
          <div
            className="p-4 border-b"
            style={{
              backgroundColor: classic ? "hsl(var(--muted))" : "rgba(255,255,255,0.05)",
            }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Сумма ₽</label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="15 000"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Дата</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Комментарий</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Аренда склада..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addExpense} disabled={saving || !newAmount}>
                {saving ? "Сохраняю..." : "Сохранить"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddExpense(false)}>
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Expenses table */}
        <div
          className="divide-y"
          style={{
            borderColor: classic ? "hsl(var(--border))" : "rgba(255,255,255,0.08)",
          }}
        >
          {data?.expenses && data.expenses.length > 0 ? (
            data.expenses.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottomColor: classic ? "hsl(var(--border))" : "rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: classic ? "hsl(var(--muted))" : "rgba(255,255,255,0.08)",
                        color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.60)",
                      }}
                    >
                      {e.category}
                    </span>
                    {e.description && (
                      <span
                        className="text-sm truncate"
                        style={{
                          color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.50)",
                        }}
                      >
                        {e.description}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.50)",
                    }}
                  >
                    {new Date(e.date).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <p className="font-semibold text-red-500 shrink-0">{formatPrice(e.amount)}</p>
                <button
                  onClick={() => setConfirmDeleteId(e.id)}
                  disabled={deleting === e.id}
                  className="transition-colors ml-2 p-1"
                  style={{
                    color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.50)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ef4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = classic
                      ? "hsl(var(--muted-foreground))"
                      : "rgba(255,255,255,0.50)";
                  }}
                >
                  {deleting === e.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))
          ) : (
            <div
              className="py-12 text-center text-sm"
              style={{
                color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.50)",
              }}
            >
              Расходов за период нет
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={deleteExpense}
        title="Удалить расход?"
        description="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
        loading={!!deleting}
      />
    </div>
  );
}

function Row({
  label, value, negative, bold, dimmed, highlight,
}: {
  label: string; value: number; negative?: boolean; bold?: boolean; dimmed?: boolean; highlight?: boolean;
}) {
  const isNeg = value < 0;
  return (
    <div className={cn("flex items-center justify-between", dimmed && "opacity-60")}>
      <span className={cn("text-muted-foreground", bold && "text-foreground font-medium")}>{label}</span>
      <span className={cn(
        "tabular-nums",
        bold && "font-bold",
        highlight && (value >= 0 ? "text-emerald-600" : "text-red-500"),
        !highlight && isNeg && "text-red-500",
      )}>
        {isNeg ? "-" : ""}{formatPrice(Math.abs(value))}
      </span>
    </div>
  );
}

function RevenueChart({ data, classic }: { data: Record<string, number>; classic: boolean }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...entries.map(([, v]) => v), 1);

  // Use proper colors: HSL CSS variables for classic mode, rgba for dark mode
  const barColor = classic ? "hsl(var(--primary))" : "hsl(var(--primary)/0.8)";
  const barColorHover = classic ? "hsl(var(--primary))" : "hsl(var(--primary))";

  return (
    <div className="flex items-end gap-1 h-24 overflow-x-auto pb-1">
      {entries.map(([day, val]) => (
        <div key={day} className="flex flex-col items-center gap-1 flex-1 min-w-[18px] group">
          <div
            className="w-full rounded-t transition-colors relative"
            style={{
              height: `${(val / max) * 80}px`,
              backgroundColor: barColor,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = barColorHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = barColor; }}
            title={`${day}: ${formatPrice(val)}`}
          />
          <span className={cn("text-[8px] hidden sm:block", classic ? "text-muted-foreground" : "text-white/50")}>
            {new Date(day).getDate()}
          </span>
        </div>
      ))}
    </div>
  );
}
