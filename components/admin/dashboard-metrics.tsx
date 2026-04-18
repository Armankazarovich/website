"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatedCounter } from "./animated-counter";
import { TrendingUp, BarChart3, Clock, ArrowUpRight, Truck } from "lucide-react";

interface MetricCardProps {
  href: string;
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
  color?: string;
  delay?: number;
}

function MetricCard({ href, icon: Icon, value, label, suffix = "", color, delay = 0 }: MetricCardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <Link
      href={href}
      className="aray-stat-card relative overflow-hidden active:scale-[0.97] transition-all duration-200"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className={`absolute top-3 right-3 p-2 rounded-xl ${color ?? "bg-primary/10"}`}>
        <Icon className={`w-4 h-4 ${color ? "text-white" : "text-primary"}`} />
      </div>
      <p className="text-[10px] lg:text-xs text-muted-foreground font-medium uppercase tracking-wide pr-10">{label}</p>
      <p className="text-xl lg:text-2xl font-bold mt-1 font-display leading-tight">
        <AnimatedCounter value={value} duration={1400} />
        {suffix && <span className="text-sm lg:text-base ml-0.5">{suffix}</span>}
      </p>
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
    <div className="arayglass-grid-metrics">
      <MetricCard href="/admin/finance" icon={TrendingUp} value={r30} label="Выручка за 30 дн." suffix=" ₽" color="bg-emerald-500" delay={0} />
      <MetricCard href="/admin/analytics" icon={BarChart3} value={rToday} label="Сегодня" suffix=" ₽" color="bg-primary" delay={80} />
      <MetricCard href="/admin/orders" icon={Clock} value={newOrders} label="Новых заказов" color="bg-amber-500" delay={160} />
      <MetricCard href="/admin/analytics" icon={ArrowUpRight} value={avg} label="Средний чек" suffix=" ₽" color="bg-violet-500" delay={240} />
    </div>
  );
}

export function CourierMetrics({ newOrders, todayOrders }: { newOrders: number; todayOrders: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard href="/admin/orders" icon={Clock} value={newOrders} label="Новых заказов" color="bg-amber-500" delay={0} />
      <MetricCard href="/admin/delivery" icon={Truck} value={todayOrders} label="Заказов сегодня" color="bg-primary" delay={80} />
    </div>
  );
}
