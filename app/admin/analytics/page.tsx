"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  ShoppingCart,
  ReceiptText,
  Users,
  BarChart2,
  Package,
  CreditCard,
  MessageCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DaySlot {
  label: string;
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface MethodCount {
  method: string;
  count: number;
}

interface AnalyticsData {
  chart: DaySlot[];
  totalRevenue30: number;
  totalOrders30: number;
  avgOrder: number;
  repeatClients: number;
  topProducts: TopProduct[];
  statusCounts: StatusCount[];
  paymentStats: MethodCount[];
  contactStats: MethodCount[];
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="aray-stat-card relative overflow-hidden">
      <div className={`absolute top-3 right-3 p-2 rounded-xl ${color ?? "bg-primary/10"}`}>
        <Icon className={`w-4 h-4 ${color ? "text-white" : "text-primary"}`} />
      </div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pr-10">{label}</p>
      <p className="text-2xl font-bold mt-1 font-display">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted/60 rounded-xl ${className}`} />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-44" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-60" />
        <Skeleton className="h-60" />
      </div>
    </div>
  );
}

// ─── SVG Bar Chart ──────────────────────────────────────────────────────────

function BarChart({
  data,
  valueKey,
  formatter,
  color = "hsl(var(--primary))",
  height = 160,
}: {
  data: DaySlot[];
  valueKey: "revenue" | "orders";
  formatter: (v: number) => string;
  color?: string;
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const values = data.map(d => d[valueKey] as number);
  const maxVal = Math.max(...values, 1);
  const padLeft = 60;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 36;
  const chartW = 800; // SVG viewBox width
  const chartH = height;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;
  const barW = Math.floor((innerW / data.length) * 0.6);
  const barGap = innerW / data.length;

  // Y-axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: padTop + innerH - t * innerH,
    label: formatter(Math.round(maxVal * t)),
  }));

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={padLeft}
            x2={chartW - padRight}
            y1={tick.y}
            y2={tick.y}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={padLeft - 6}
            y={tick.y + 4}
            textAnchor="end"
            fontSize={9}
            fill="currentColor"
            opacity={0.45}
          >
            {tick.label}
          </text>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const val = d[valueKey] as number;
          const barH = val === 0 ? 2 : Math.max(4, (val / maxVal) * innerH);
          const bx = padLeft + i * barGap + (barGap - barW) / 2;
          const by = padTop + innerH - barH;
          const showLabel = i % 5 === 0 || i === data.length - 1;

          return (
            <g key={i}>
              <rect
                x={bx}
                y={by}
                width={barW}
                height={barH}
                rx={3}
                fill={color}
                opacity={val === 0 ? 0.15 : 0.85}
                className="transition-opacity hover:opacity-100 cursor-pointer"
                onMouseEnter={e => {
                  const svg = svgRef.current;
                  if (!svg) return;
                  const rect = svg.getBoundingClientRect();
                  const scaleX = rect.width / chartW;
                  const scaleY = rect.height / chartH;
                  setTooltip({
                    x: (bx + barW / 2) * scaleX,
                    y: by * scaleY,
                    label: d.label,
                    value: formatter(val),
                  });
                }}
              />
              {/* X-axis date label every 5th */}
              {showLabel && (
                <text
                  x={bx + barW / 2}
                  y={chartH - padBottom + 14}
                  textAnchor="middle"
                  fontSize={8.5}
                  fill="currentColor"
                  opacity={0.45}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-popover border border-border text-popover-foreground text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <span className="font-medium">{tooltip.label}</span>
          <span className="ml-1.5 text-primary font-bold">{tooltip.value}</span>
        </div>
      )}
    </div>
  );
}

// ─── Horizontal Bar Chart (top products) ───────────────────────────────────

function HorizontalBarChart({ products }: { products: TopProduct[] }) {
  const maxRev = Math.max(...products.map(p => p.revenue), 1);

  return (
    <div className="space-y-2.5">
      {products.map((p, i) => (
        <div key={i} className="group">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium truncate max-w-[55%]" title={p.name}>
              {p.name}
            </span>
            <span className="text-muted-foreground shrink-0 ml-2">
              {formatPrice(p.revenue)}{" "}
              <span className="opacity-60">× {p.count}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/80 group-hover:bg-primary transition-colors"
              style={{ width: `${(p.revenue / maxRev) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut-style method breakdown ──────────────────────────────────────────

const METHOD_COLORS = [
  "bg-primary/80",
  "bg-sky-500/80",
  "bg-emerald-500/80",
  "bg-amber-500/80",
  "bg-rose-500/80",
  "bg-violet-500/80",
];

function MethodBreakdown({ items, total }: { items: MethodCount[]; total: number }) {
  const sorted = [...items].sort((a, b) => b.count - a.count);
  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${METHOD_COLORS[i % METHOD_COLORS.length]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="font-medium truncate">{item.method}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{item.count} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${METHOD_COLORS[i % METHOD_COLORS.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Error state
  if (!loading && error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle className="w-10 h-10 text-destructive/70" />
        <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
        <button
          onClick={() => load()}
          className="text-xs px-4 py-2 rounded-xl border border-border hover:bg-primary/[0.05] transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48 mb-1.5" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  if (!data) return null;

  const totalOrdersAll = data.statusCounts.reduce((s, c) => s + c.count, 0);
  const totalPayments = data.paymentStats.reduce((s, c) => s + c.count, 0);
  const totalContacts = data.contactStats.reduce((s, c) => s + c.count, 0);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-7">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Аналитика продаж</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Данные за последние 30 дней и всё время
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-primary/[0.05] transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Выручка (30 дн)"
          value={formatPrice(data.totalRevenue30)}
          sub="по завершённым заказам"
          color="bg-emerald-500"
        />
        <StatCard
          icon={ShoppingCart}
          label="Заказов (30 дн)"
          value={String(data.totalOrders30)}
          sub={`всего в базе: ${totalOrdersAll}`}
          color="bg-primary"
        />
        <StatCard
          icon={ReceiptText}
          label="Средний чек"
          value={formatPrice(data.avgOrder)}
          sub="за последние 30 дней"
          color="bg-amber-500"
        />
        <StatCard
          icon={Users}
          label="Повторные клиенты"
          value={String(data.repeatClients)}
          sub="уникальных телефонов ≥ 2 заказов"
          color="bg-violet-500"
        />
      </div>

      {/* ── Revenue Chart ── */}
      <div className="aray-stat-card space-y-3">
        <AdminSectionTitle
          icon={TrendingUp}
          title="Выручка по дням"
          subtitle="последние 30 дней"
        />
        <BarChart
          data={data.chart}
          valueKey="revenue"
          formatter={v => (v === 0 ? "0" : formatPrice(v))}
          height={180}
        />
      </div>

      {/* ── Orders Chart ── */}
      <div className="aray-stat-card space-y-3">
        <AdminSectionTitle
          icon={BarChart2}
          title="Заказы по дням"
          subtitle="последние 30 дней"
        />
        <BarChart
          data={data.chart}
          valueKey="orders"
          formatter={v => `${v} шт`}
          color="hsl(var(--primary) / 0.65)"
          height={140}
        />
      </div>

      {/* ── Two-column row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top products */}
        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={Package}
            title="Топ товаров"
            subtitle="по выручке за всё время"
          />
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Нет данных</p>
          ) : (
            <HorizontalBarChart products={data.topProducts} />
          )}
        </div>

        {/* Status distribution */}
        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={ShoppingCart}
            title="Статусы заказов"
            subtitle={`всего ${totalOrdersAll} заказов`}
          />
          <div className="flex flex-wrap gap-2">
            {data.statusCounts
              .slice()
              .sort((a, b) => b.count - a.count)
              .map(s => {
                const colorClass =
                  ORDER_STATUS_COLORS[s.status] ??
                  "bg-muted text-muted-foreground";
                const label =
                  ORDER_STATUS_LABELS[s.status] ?? s.status;
                return (
                  <span
                    key={s.status}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${colorClass}`}
                  >
                    {label}
                    <span className="font-bold">{s.count}</span>
                  </span>
                );
              })}
          </div>

          {/* Mini progress bars per status */}
          <div className="space-y-1.5 pt-1">
            {data.statusCounts
              .slice()
              .sort((a, b) => b.count - a.count)
              .map(s => {
                const pct =
                  totalOrdersAll > 0
                    ? Math.round((s.count / totalOrdersAll) * 100)
                    : 0;
                return (
                  <div key={s.status} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 text-muted-foreground truncate">
                      {ORDER_STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Payment & Contact ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Payment methods */}
        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={CreditCard}
            title="Способы оплаты"
            subtitle={`${totalPayments} заказов`}
          />
          {data.paymentStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Нет данных</p>
          ) : (
            <MethodBreakdown items={data.paymentStats} total={totalPayments} />
          )}
        </div>

        {/* Contact method */}
        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={MessageCircle}
            title="Способы связи"
            subtitle={`${totalContacts} заказов`}
          />
          {data.contactStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Нет данных</p>
          ) : (
            <MethodBreakdown items={data.contactStats} total={totalContacts} />
          )}
        </div>
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        Данные обновляются в реальном времени из базы PostgreSQL
      </p>
    </div>
  );
}
