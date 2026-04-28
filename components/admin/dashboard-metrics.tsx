"use client";

/**
 * DashboardMetrics — главные KPI-карточки дашборда.
 *
 * Сессия 40 (28.04.2026): полная переписка под calm UI магазина.
 * Удалено:
 *  - aray-stat-card / arayglass-grid-metrics (старый ARAYGLASS)
 *  - color="bg-emerald-500" с белой иконкой (тёмные плашки на светлой теме = радуга)
 *
 * Добавлено:
 *  - bg-card border-border rounded-2xl, hover:border-primary/30 + glow
 *  - Цветные иконки в кружках semantic: emerald (revenue), primary (today),
 *    amber (warning/orders), violet (analytics)
 *  - Крупные числа font-display, primary акцент при необходимости
 *  - Trend hint снизу (опционально)
 *  - Анимация появления + counter
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatedCounter } from "./animated-counter";
import { TrendingUp, BarChart3, Clock, ArrowUpRight, Truck } from "lucide-react";

type Tone = "emerald" | "primary" | "amber" | "violet";

const TONE_ICON: Record<Tone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  primary: "bg-primary/12 text-primary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

interface MetricCardProps {
  href: string;
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
  tone: Tone;
  hint?: string;
  delay?: number;
}

function MetricCard({ href, icon: Icon, value, label, suffix = "", tone, hint, delay = 0 }: MetricCardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <Link
      href={href}
      className="group relative bg-card border border-border rounded-2xl p-4 sm:p-5 active:scale-[0.98] transition-all duration-200 hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.08)]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider leading-tight">
          {label}
        </p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${TONE_ICON[tone]}`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
      </div>
      <p className="font-display font-bold text-2xl sm:text-3xl mt-2 text-foreground leading-tight">
        <AnimatedCounter value={value} duration={1400} />
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      <MetricCard
        href="/admin/finance"
        icon={TrendingUp}
        value={r30}
        label="Выручка 30 дней"
        suffix=" ₽"
        tone="emerald"
        hint="Все продажи без отменённых"
        delay={0}
      />
      <MetricCard
        href="/admin/analytics"
        icon={BarChart3}
        value={rToday}
        label="Сегодня"
        suffix=" ₽"
        tone="primary"
        hint="С полуночи"
        delay={80}
      />
      <MetricCard
        href="/admin/orders?status=NEW"
        icon={Clock}
        value={newOrders}
        label="Новых заказов"
        tone="amber"
        hint="Ожидают подтверждения"
        delay={160}
      />
      <MetricCard
        href="/admin/analytics"
        icon={ArrowUpRight}
        value={avg}
        label="Средний чек"
        suffix=" ₽"
        tone="violet"
        hint="За 30 дней"
        delay={240}
      />
    </div>
  );
}

export function CourierMetrics({ newOrders, todayOrders }: { newOrders: number; todayOrders: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      <MetricCard href="/admin/orders" icon={Clock} value={newOrders} label="Новых заказов" tone="amber" delay={0} />
      <MetricCard href="/admin/delivery" icon={Truck} value={todayOrders} label="Доставок сегодня" tone="primary" delay={80} />
    </div>
  );
}
