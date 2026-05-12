"use client";

/**
 * DashboardMetrics — главные KPI-карточки рабочего стола.
 *
 * Сессия 40+ (2026-05-01): calm UI и единый закон ARAY.
 *  - карточки держат общий bg-card / border / rounded-2xl ритм;
 *  - обычные KPI берут цвет выбранной атмосферы;
 *  - warning/success/danger цвета оставляем только для реальных статусов;
 *  - декоративную радугу не возвращаем.
 *
 * Добавлено:
 *  - Крупные числа font-display, primary акцент при необходимости
 *  - Trend hint снизу (опционально)
 */
import Link from "next/link";
import {
  ARAY_ICON_TONE,
  ARAY_ICON_TONE_MUTED,
  ARAY_ICON_TONE_WARNING,
} from "@/lib/aray-design-tokens";
import { TrendingUp, BarChart3, Clock, ArrowUpRight, Truck } from "lucide-react";

type Tone = "primary" | "muted" | "warning";

const TONE_ICON: Record<Tone, string> = {
  primary: ARAY_ICON_TONE,
  muted: ARAY_ICON_TONE_MUTED,
  warning: ARAY_ICON_TONE_WARNING,
};

interface MetricCardProps {
  href: string;
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
  tone: Tone;
  hint?: string;
}

function MetricCard({ href, icon: Icon, value, label, suffix = "", tone, hint }: MetricCardProps) {
  return (
    <Link
      href={href}
      prefetch
      className="admin-liquid-surface group rounded-2xl p-4 sm:p-5 min-w-0 transition-colors hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-label={`${label}: ${value.toLocaleString("ru-RU")}${suffix}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider leading-tight">
          {label}
        </p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${TONE_ICON[tone]}`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
      </div>
      <p className="font-display font-bold text-2xl sm:text-3xl mt-2 text-foreground leading-tight tabular-nums">
        {value.toLocaleString("ru-RU")}
        {suffix && <span className="text-base sm:text-lg ml-0.5 text-muted-foreground/80">{suffix}</span>}
      </p>
      {hint && (
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
          {hint}
        </p>
      )}
    </Link>
  );
}

interface DashboardMetricsProps {
  revenue30: number;
  revenueToday: number;
  newOrders: number;
  avgOrder: number;
}

export function DashboardMetrics({ revenue30, revenueToday, newOrders, avgOrder }: DashboardMetricsProps) {
  const r30 = Math.round(revenue30);
  const rToday = Math.round(revenueToday);
  const avg = Math.round(avgOrder);
  const hasRevenue30 = r30 > 0;
  const hasRevenueToday = rToday > 0;
  const hasAvgOrder = avg > 0;

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
      <MetricCard
        href="/admin/finance"
        icon={TrendingUp}
        value={r30}
        label="Выручка 30 дней"
        suffix=" ₽"
        tone="primary"
        hint={hasRevenue30 ? "Все продажи без отмененных" : "Начни с терминала или каталога"}
      />
      <MetricCard
        href="/admin/analytics"
        icon={BarChart3}
        value={rToday}
        label="Сегодня"
        suffix=" ₽"
        tone="primary"
        hint={hasRevenueToday ? "С полуночи" : "Можно создать заказ в терминале"}
      />
      <MetricCard
        href="/admin/orders?status=NEW"
        icon={Clock}
        value={newOrders}
        label="Новых заказов"
        tone={newOrders > 0 ? "warning" : "primary"}
        hint={newOrders > 0 ? "Ожидают подтверждения" : "Очередь свободна"}
      />
      <MetricCard
        href="/admin/analytics"
        icon={ArrowUpRight}
        value={avg}
        label="Средний чек"
        suffix=" ₽"
        tone="primary"
        hint={hasAvgOrder ? "За 30 дней" : "Появится после первой продажи"}
      />
    </div>
  );
}

export function CourierMetrics({ newOrders, todayOrders }: { newOrders: number; todayOrders: number }) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
      <MetricCard href="/admin/orders" icon={Clock} value={newOrders} label="Новых заказов" tone={newOrders > 0 ? "warning" : "primary"} />
      <MetricCard href="/admin/delivery" icon={Truck} value={todayOrders} label="Доставок сегодня" tone="primary" />
    </div>
  );
}
