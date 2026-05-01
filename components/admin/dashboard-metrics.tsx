"use client";

/**
 * DashboardMetrics — главные KPI-карточки дашборда.
 *
 * Сессия 40+ (2026-05-01): calm UI и единый закон ARAY.
 *  - карточки держат общий bg-card / border / rounded-2xl ритм;
 *  - обычные KPI берут цвет выбранной атмосферы;
 *  - warning/success/danger цвета оставляем только для реальных статусов;
 *  - декоративную радугу не возвращаем.
 *
 * Добавлено:
 *  - hover:border-primary/30 + glow
 *  - Крупные числа font-display, primary акцент при необходимости
 *  - Trend hint снизу (опционально)
 *  - Анимация появления + counter
 */
import type { MouseEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ARAY_ICON_TONE,
  ARAY_ICON_TONE_MUTED,
  ARAY_ICON_TONE_WARNING,
} from "@/lib/aray-design-tokens";
import { AnimatedCounter } from "./animated-counter";
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
  delay?: number;
}

function MetricCard({ href, icon: Icon, value, label, suffix = "", tone, hint, delay = 0 }: MetricCardProps) {
  const [visible, setVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      href={href}
      prefetch
      onClick={handleClick}
      aria-busy={isPending}
      className="admin-liquid-surface admin-liquid-interactive group rounded-2xl p-4 sm:p-5 active:scale-[0.98] min-w-0"
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
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isPending ? "animate-pulse" : ""} ${TONE_ICON[tone]}`}>
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
    <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
      <MetricCard
        href="/admin/finance"
        icon={TrendingUp}
        value={r30}
        label="Выручка 30 дней"
        suffix=" ₽"
        tone="primary"
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
        tone={newOrders > 0 ? "warning" : "primary"}
        hint="Ожидают подтверждения"
        delay={160}
      />
      <MetricCard
        href="/admin/analytics"
        icon={ArrowUpRight}
        value={avg}
        label="Средний чек"
        suffix=" ₽"
        tone="primary"
        hint="За 30 дней"
        delay={240}
      />
    </div>
  );
}

export function CourierMetrics({ newOrders, todayOrders }: { newOrders: number; todayOrders: number }) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
      <MetricCard href="/admin/orders" icon={Clock} value={newOrders} label="Новых заказов" tone={newOrders > 0 ? "warning" : "primary"} delay={0} />
      <MetricCard href="/admin/delivery" icon={Truck} value={todayOrders} label="Доставок сегодня" tone="primary" delay={80} />
    </div>
  );
}
