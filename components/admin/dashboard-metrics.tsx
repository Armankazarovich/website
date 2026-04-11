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
  prefix?: string;
  suffix?: string;
  delay?: number;
}

function MetricCard({ href, icon: Icon, value, label, prefix = "", suffix = "", delay = 0 }: MetricCardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <Link
      href={href}
      className="dash-metric-card group bg-card rounded-2xl border border-border p-4 active:scale-[0.97] transition-all duration-300 relative overflow-hidden hover:border-primary/30"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.08), transparent 70%)" }}
      />

      <div className="relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
          style={{ background: "hsl(var(--primary)/0.12)" }}
        >
          <Icon className="w-[18px] h-[18px] text-primary" />
        </div>
        <p className="text-2xl font-display font-bold leading-tight">
          {prefix && <span className="text-lg">{prefix}</span>}
          <AnimatedCounter value={value} duration={1400} />
          {suffix && <span className="text-base ml-0.5">{suffix}</span>}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
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
  // Format numbers for display: strip to integers for counter
  const r30 = Math.round(revenue30);
  const rToday = Math.round(revenueToday);
  const avg = Math.round(avgOrder);

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard href="/admin/finance" icon={TrendingUp} value={r30} label="Выручка за 30 дн." suffix=" ₽" delay={0} />
      <MetricCard href="/admin/analytics" icon={BarChart3} value={rToday} label="Сегодня" suffix=" ₽" delay={80} />
      <MetricCard href="/admin/orders" icon={Clock} value={newOrders} label="Новых заказов" delay={160} />
      <MetricCard href="/admin/analytics" icon={ArrowUpRight} value={avg} label="Средний чек" suffix=" ₽" delay={240} />
    </div>
  );
}

export function CourierMetrics({ newOrders, todayOrders }: { newOrders: number; todayOrders: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard href="/admin/orders" icon={Clock} value={newOrders} label="Новых заказов" delay={0} />
      <MetricCard href="/admin/delivery" icon={Truck} value={todayOrders} label="Заказов сегодня" delay={80} />
    </div>
  );
}
