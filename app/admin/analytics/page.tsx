"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  ShoppingCart,
  ReceiptText,
  Users,
  BarChart2,
  Package,
  CreditCard,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  Radio,
  Target,
  CheckCircle2,
  CircleAlert,
  ArrowRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import {
  formatPrice,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/utils";

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

interface SourceStat {
  group:
    | "direct_ad"
    | "google_ads"
    | "organic"
    | "social"
    | "referral"
    | "direct"
    | "other";
  label: string;
  count: number;
  revenue: number;
}

interface CampaignStat {
  campaign: string;
  group: SourceStat["group"];
  label: string;
  count: number;
  revenue: number;
}

interface AnalyticsMarketing {
  directSpend: {
    connected: boolean;
    available: boolean;
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
    regions: Array<{ id: string; name: string; visits: number; users: number; goalReaches: number }>;
    sources: Array<{ id: string; name: string; visits: number; users: number; goalReaches: number }>;
    error: string | null;
  };
  directRevenue: number;
  directRoas: number | null;
  attributionRevenue: number;
  note: string;
}

interface AnalyticsPeriod {
  days: 7 | 30 | 90;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  label: string;
  updatedAt: string;
}

interface AnalyticsComparison {
  previousRevenue: number;
  previousOrders: number;
  previousAvgOrder: number;
  revenueDeltaPct: number | null;
  ordersDeltaPct: number | null;
  avgOrderDeltaPct: number | null;
}

interface ReadinessItem {
  key: string;
  label: string;
  status: "ready" | "attention" | "missing";
  text: string;
}

interface AnalyticsFunnel {
  directClicks: number;
  directSessions: number;
  metrikaVisits: number;
  metrikaGoals: number;
  attributedOrders: number;
  attributedRevenue: number;
  clickToSessionRate: number | null;
  clickToGoalRate: number | null;
  goalToOrderRate: number | null;
}

interface AnalyticsData {
  period: AnalyticsPeriod;
  chart: DaySlot[];
  totalRevenue30: number;
  totalOrders30: number;
  avgOrder: number;
  comparison: AnalyticsComparison;
  repeatClients: number;
  topProducts: TopProduct[];
  statusCounts: StatusCount[];
  paymentStats: MethodCount[];
  contactStats: MethodCount[];
  sourceStats: SourceStat[];
  campaignStats: CampaignStat[];
  readiness: {
    score: number;
    items: ReadinessItem[];
    goals: Record<string, string>;
  };
  funnel: AnalyticsFunnel;
  marketing: AnalyticsMarketing;
}

// Цвет (Tailwind text class) для каждой группы источника — совпадает с humanizeSource
const SOURCE_COLORS: Record<SourceStat["group"], string> = {
  direct_ad: "text-red-500",
  google_ads: "text-blue-500",
  organic: "text-emerald-500",
  social: "text-violet-500",
  referral: "text-amber-500",
  direct: "text-muted-foreground",
  other: "text-muted-foreground",
};
const SOURCE_BG: Record<SourceStat["group"], string> = {
  direct_ad: "bg-red-500",
  google_ads: "bg-blue-500",
  organic: "bg-emerald-500",
  social: "bg-violet-500",
  referral: "bg-amber-500",
  direct: "bg-muted-foreground",
  other: "bg-muted-foreground",
};

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
      <div
        className={`absolute top-3 right-3 p-2 rounded-xl ${color ?? "bg-primary/10"}`}
      >
        <Icon className={`w-4 h-4 ${color ? "text-white" : "text-primary"}`} />
      </div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pr-10">
        {label}
      </p>
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
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    value: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const values = data.map((d) => d[valueKey] as number);
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
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
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
                onMouseEnter={(e) => {
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
  const maxRev = Math.max(...products.map((p) => p.revenue), 1);

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

function MethodBreakdown({
  items,
  total,
}: {
  items: MethodCount[];
  total: number;
}) {
  const sorted = [...items].sort((a, b) => b.count - a.count);
  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${METHOD_COLORS[i % METHOD_COLORS.length]}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="font-medium truncate">{item.method}</span>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {item.count} ({pct}%)
                </span>
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

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value: number | null) {
  return value == null ? "нет данных" : `${value.toFixed(2)}x`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 сек";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes} мин ${rest} сек` : `${rest} сек`;
}

const RANGE_OPTIONS: Array<{ value: 7 | 30 | 90; label: string }> = [
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
];

function formatDelta(value: number | null) {
  if (value == null) return "нет прошлого периода";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% к прошлому периоду`;
}

function formatNullablePercent(value: number | null, digits = 1) {
  return value == null ? "нет данных" : formatPercent(value, digits);
}

function periodSubtitle(data: AnalyticsData) {
  return `последние ${data.period.days} дней · обновлено ${new Date(
    data.period.updatedAt,
  ).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

function AnalyticsMarketingPanel({ data }: { data: AnalyticsData }) {
  const direct = data.marketing.directSpend;
  const metrika = data.marketing.metrikaTraffic;
  const directReady = direct.available;
  const metrikaReady = metrika.available;
  const metrikaNeedsAccess = !metrika.connected;
  const topSource = data.sourceStats.find((source) => source.count > 0 || source.revenue > 0);
  const topCampaign = data.campaignStats[0];
  const topProduct = data.topProducts[0];
  const periodDays = data.period.days;
  const metrikaStatus = metrikaReady
    ? `${metrika.visits} визитов, ${metrika.goalReaches} целей`
    : metrikaNeedsAccess
      ? "нужен доступ к Метрике и счетчик"
      : metrika.error || "нет данных Метрики за период";
  const healthRows = data.readiness.items;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <AdminSectionTitle
          icon={Target}
          title="Аналитика: деньги, реклама, спрос"
          subtitle={`Показываем факты за ${periodDays} дней: заказы из базы, расходы Direct и Метрику`}
        />
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/admin/finance"
            className="inline-flex min-h-9 items-center rounded-xl border border-border bg-background px-3 font-medium hover:bg-muted/40"
          >
            Финансы
          </Link>
          <Link
            href="/admin/promotion"
            className="inline-flex min-h-9 items-center rounded-xl border border-primary/35 bg-primary/10 px-3 font-semibold text-primary hover:bg-primary/15"
          >
            Продвижение
          </Link>
          <Link
            href="/admin/aray/connectors"
            className="inline-flex min-h-9 items-center rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 font-semibold text-amber-300 hover:bg-amber-400/15"
          >
            Яндекс-пакет
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart2}
          label="Расход Direct"
          value={formatPrice(direct.spend)}
          sub={
            directReady
              ? `${direct.clicks} кликов · ${direct.sessions} визитов · CTR ${formatPercent(direct.ctr)}`
              : direct.error || "Direct OAuth не подключен"
          }
          color="bg-rose-500"
        />
        <StatCard
          icon={Target}
          label="CPC / CPA"
          value={`${formatPrice(direct.avgCpc)} / ${formatPrice(direct.costPerConversion)}`}
          sub={`${direct.conversions.toFixed(0)} конверсий · CR ${formatPercent(direct.conversionRate)}`}
          color="bg-sky-500"
        />
        <StatCard
          icon={TrendingUp}
          label="ROAS Direct"
          value={formatRatio(data.marketing.directRoas)}
          sub={`Выручка с Direct: ${formatPrice(data.marketing.directRevenue)}`}
          color="bg-emerald-500"
        />
        <StatCard
          icon={Radio}
          label="Метрика"
          value={`${metrika.visits} визитов`}
          sub={
            metrikaReady
              ? `${metrika.goalReaches} целей · конверсия ${formatPercent(metrika.conversionRate, 2)}`
              : metrikaStatus
          }
          color="bg-violet-500"
        />
      </div>

      <div className="aray-stat-card border-primary/25 bg-primary/[0.04]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Готовность аналитики: {data.readiness.score}%
            </div>
            <h3 className="mt-2 text-lg font-semibold">
              Заказы, реклама и путь клиента собраны в один пульт.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Я вижу выручку, заказы, расходы Direct, источники и цели. Если ключи или цели еще
              не подключены, показываю это честно и сразу подсказываю, что доделать.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/aray/connectors"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Подключить данные
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/promotion"
              className="inline-flex min-h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium hover:bg-muted/40"
            >
              Реклама
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          {healthRows.map((row) => {
            const ready = row.status === "ready";
            const Icon = ready ? CheckCircle2 : CircleAlert;
            return (
              <div
                key={row.label}
                className="rounded-xl border border-border/70 bg-background/55 p-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon
                    className={`h-4 w-4 ${ready ? "text-emerald-400" : "text-amber-300"}`}
                  />
                  {row.label}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={BarChart2}
            title="Direct"
            subtitle={directReady ? "расходы из отчета Яндекса" : "нужен вход через Яндекс"}
          />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Клики</p>
              <p className="font-semibold">{direct.clicks}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Показы</p>
              <p className="font-semibold">{direct.impressions}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className="font-semibold">{formatPercent(direct.ctr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPA</p>
              <p className="font-semibold">{formatPrice(direct.costPerConversion)}</p>
            </div>
          </div>
          {direct.campaigns.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-2">
              {direct.campaigns.slice(0, 3).map((campaign) => (
                <div
                  key={campaign.id || campaign.name}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 truncate font-medium" title={campaign.name}>
                    {campaign.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatPrice(campaign.spend)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Здесь видно, сколько стоит трафик. Окупаемость считается только когда заказы связаны с UTM или yclid.
          </p>
        </div>

        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={ArrowRight}
            title="Воронка"
            subtitle="клик, визит, цель, заказ"
          />
          <div className="space-y-2 text-sm">
            {[
              ["Клики Direct", data.funnel.directClicks],
              ["Визиты", data.funnel.directSessions || data.funnel.metrikaVisits],
              ["Цели Метрики", data.funnel.metrikaGoals],
              ["Заказы с Direct", data.funnel.attributedOrders],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">
            <p>Клик → визит: {formatNullablePercent(data.funnel.clickToSessionRate)}</p>
            <p>Клик → цель: {formatNullablePercent(data.funnel.clickToGoalRate)}</p>
            <p>Цель → заказ: {formatNullablePercent(data.funnel.goalToOrderRate)}</p>
          </div>
        </div>

        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={Radio}
            title="Метрика"
            subtitle={metrikaReady ? `${metrika.users} пользователей` : "нужно подключить один раз"}
          />
          {metrikaReady ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Просмотры</p>
                <p className="font-semibold">{metrika.pageviews}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Отказы</p>
                <p className="font-semibold">{formatPercent(metrika.bounceRate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Глубина</p>
                <p className="font-semibold">{metrika.pageDepth.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Время</p>
                <p className="font-semibold">{formatDuration(metrika.avgVisitDurationSeconds)}</p>
              </div>
              {metrika.counterId && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Счетчик</p>
                  <p className="font-semibold">#{metrika.counterId}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <CircleAlert className="h-4 w-4" />
                Метрика пока не дает данные
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Подключим счетчик и цели, тогда появятся визиты, заявки, звонки, регионы и источники.
              </p>
            </div>
          )}
          {metrika.sensitiveDataLimited && (
            <p className="text-xs leading-relaxed text-amber-300">
              Метрика ограничила часть чувствительных данных. Главные totals сохранены.
            </p>
          )}
          <Link
            href="/admin/aray/connectors"
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted/40"
          >
            Настроить Метрику
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={Search}
            title="Спрос из заказов"
            subtitle="что уже видно без Метрики"
          />
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Товар с выручкой</p>
              <p className="font-semibold">{topProduct ? topProduct.name : "пока нет заказов"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Источник заказов</p>
              <p className="font-semibold">{topSource ? topSource.label : "источник не определен"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Кампания</p>
              <p className="font-semibold">{topCampaign ? topCampaign.campaign : "нет UTM-кампаний"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={Radio}
            title="Источники Метрики"
            subtitle={metrikaReady ? `${metrika.users} пользователей` : "появятся после подключения"}
          />
          {metrikaReady && metrika.sources.length ? (
            <div className="space-y-2">
              {metrika.sources.slice(0, 5).map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium">{source.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {source.visits} виз. · {source.goalReaches} целей
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Здесь будут каналы трафика: реклама, поиск, прямые заходы, соцсети и переходы с сайтов.
            </p>
          )}
        </div>

        <div className="aray-stat-card space-y-3">
          <AdminSectionTitle
            icon={Users}
            title="Регионы аудитории"
            subtitle={metrikaReady ? "по визитам и целям" : "появятся после подключения"}
          />
          {metrikaReady && metrika.regions.length ? (
            <div className="space-y-2">
              {metrika.regions.slice(0, 5).map((region) => (
                <div key={region.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium">{region.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {region.visits} виз. · {region.goalReaches} целей
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Здесь будут города и области: где есть спрос, где клики есть, а заявок мало.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {data.marketing.note}
      </p>
    </section>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);

  const load = useCallback(async (quiet = false, nextRange = rangeDays) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?range=${nextRange}`);
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
  }, [rangeDays]);

  useEffect(() => {
    load(false, rangeDays);
  }, [load, rangeDays]);

  // ── Error state
  if (!loading && error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle className="w-10 h-10 text-destructive/70" />
        <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
        <button
          onClick={() => load(false, rangeDays)}
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
      <div className="admin-page-frame admin-page-frame-fluid">
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
    <div className="admin-page-frame admin-page-frame-fluid">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Аналитика</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? periodSubtitle(data) : "Данные из заказов, Direct и Метрики"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRangeDays(option.value)}
                className={`min-h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  rangeDays === option.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-xs transition-colors hover:bg-primary/[0.05] disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Обновить
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label={`Выручка (${data.period.days} дн)`}
          value={formatPrice(data.totalRevenue30)}
          sub={formatDelta(data.comparison.revenueDeltaPct)}
          color="bg-emerald-500"
        />
        <StatCard
          icon={ShoppingCart}
          label={`Заказов (${data.period.days} дн)`}
          value={String(data.totalOrders30)}
          sub={`${formatDelta(data.comparison.ordersDeltaPct)} · всего: ${totalOrdersAll}`}
          color="bg-primary"
        />
        <StatCard
          icon={ReceiptText}
          label="Средний чек"
          value={formatPrice(data.avgOrder)}
          sub={formatDelta(data.comparison.avgOrderDeltaPct)}
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

      <AnalyticsMarketingPanel data={data} />

      {/* ── Revenue Chart ── */}
      <div className="aray-stat-card space-y-3">
        <AdminSectionTitle
          icon={TrendingUp}
          title="Выручка по дням"
          subtitle={`последние ${data.period.days} дней`}
        />
        <BarChart
          data={data.chart}
          valueKey="revenue"
          formatter={(v) => (v === 0 ? "0" : formatPrice(v))}
          height={180}
        />
      </div>

      {/* ── Orders Chart ── */}
      <div className="aray-stat-card space-y-3">
        <AdminSectionTitle
          icon={BarChart2}
          title="Заказы по дням"
          subtitle={`последние ${data.period.days} дней`}
        />
        <BarChart
          data={data.chart}
          valueKey="orders"
          formatter={(v) => `${v} шт`}
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
            subtitle="без отменённых и удалённых заказов"
          />
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Нет заказов
            </p>
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
              .map((s) => {
                const colorClass =
                  ORDER_STATUS_COLORS[s.status] ??
                  "bg-muted text-muted-foreground";
                const label = ORDER_STATUS_LABELS[s.status] ?? s.status;
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
              .map((s) => {
                const pct =
                  totalOrdersAll > 0
                    ? Math.round((s.count / totalOrdersAll) * 100)
                    : 0;
                return (
                  <div
                    key={s.status}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-28 shrink-0 text-muted-foreground truncate">
                      {ORDER_STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-muted-foreground">
                      {pct}%
                    </span>
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
            <p className="text-sm text-muted-foreground text-center py-6">
              Нет заказов
            </p>
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
            <p className="text-sm text-muted-foreground py-6 text-center">
              Нет заказов
            </p>
          ) : (
            <MethodBreakdown items={data.contactStats} total={totalContacts} />
          )}
        </div>
      </div>

      {/* ── UTM Attribution: Sources + Campaigns ── */}
      {(() => {
        const totalSourceOrders = data.sourceStats.reduce(
          (s, x) => s + x.count,
          0,
        );
        const totalSourceRevenue = data.sourceStats.reduce(
          (s, x) => s + x.revenue,
          0,
        );
        const maxSourceRev = Math.max(
          ...data.sourceStats.map((x) => x.revenue),
          1,
        );

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sources breakdown */}
            <div className="aray-stat-card space-y-3">
              <AdminSectionTitle
                icon={Radio}
                title="Источники заказов"
                subtitle={`последние ${data.period.days} дней · ${totalSourceOrders} заказов`}
              />
              {totalSourceOrders === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Нет заказов с UTM-атрибуцией за выбранный период.
                  <br />
                  <span className="text-xs opacity-70">
                    Запустите рекламу с UTM-метками для отслеживания.
                  </span>
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.sourceStats
                    .filter((s) => s.count > 0)
                    .map((s) => {
                      const pct =
                        totalSourceOrders > 0
                          ? Math.round((s.count / totalSourceOrders) * 100)
                          : 0;
                      return (
                        <Link
                          key={s.group}
                          href={`/admin/orders?source=${s.group}`}
                          className="group block hover:bg-primary/[0.04] -mx-2 px-2 py-1 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${SOURCE_BG[s.group]}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span
                                  className={`font-medium truncate ${SOURCE_COLORS[s.group]}`}
                                >
                                  {s.label}
                                </span>
                                <span className="text-muted-foreground shrink-0 ml-2">
                                  {s.count} ({pct}%) · {formatPrice(s.revenue)}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${SOURCE_BG[s.group]} transition-all`}
                                  style={{
                                    width: `${(s.revenue / maxSourceRev) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  {totalSourceRevenue > 0 && (
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                      Общая выручка с атрибуцией:{" "}
                      <span className="font-semibold text-foreground">
                        {formatPrice(totalSourceRevenue)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Top campaigns */}
            <div className="aray-stat-card space-y-3">
              <AdminSectionTitle
                icon={Target}
                title="Топ кампаний"
                subtitle={`${data.campaignStats.length} кампаний · ${data.period.days} дней`}
              />
              {data.campaignStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Нет данных по кампаниям.
                  <br />
                  <span className="text-xs opacity-70">
                    Добавьте utm_campaign в ссылки на рекламу.
                  </span>
                </p>
              ) : (
                <div className="space-y-2">
                  {data.campaignStats.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-xs py-1.5 border-b border-border/40 last:border-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${SOURCE_BG[c.group]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={c.campaign}>
                          {c.campaign}
                        </p>
                        <p
                          className={`text-[10px] ${SOURCE_COLORS[c.group]} opacity-80`}
                        >
                          {c.label}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">
                          {formatPrice(c.revenue)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.count} зак.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        Данные обновляются в реальном времени из базы PostgreSQL
      </p>
    </div>
  );
}
