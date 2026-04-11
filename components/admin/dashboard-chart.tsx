"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";
import { AdminSectionTitle } from "./admin-section-title";

interface ChartDay {
  label: string;
  amount: number;
}

interface DashboardChartProps {
  days: ChartDay[];
  revenue7: string;
  revenue30: string;
}

export function DashboardChart({ days, revenue7, revenue30 }: DashboardChartProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const maxAmount = Math.max(...days.map(d => d.amount), 1);

  return (
    <Link
      href="/admin/analytics"
      className="block bg-card rounded-2xl border border-border p-5 active:scale-[0.99] transition-all duration-300 hover:border-primary/20 group"
    >
      <div className="flex items-center justify-between mb-4">
        <AdminSectionTitle icon={BarChart3} title="Выручка — 7 дней" className="mb-0" />
        <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all">
          Аналитика <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      <div className="flex items-end gap-1.5 h-28">
        {days.map((d, i) => {
          const pct = Math.max((d.amount / maxAmount) * 100, d.amount > 0 ? 6 : 0);
          const isToday = i === days.length - 1;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Amount tooltip on hover */}
              {d.amount > 0 && (
                <span className="text-[9px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {Math.round(d.amount / 1000)}к
                </span>
              )}
              <div className="relative flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                    isToday
                      ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                      : "bg-primary/25 hover:bg-primary/40"
                  }`}
                  style={{
                    height: animated ? `${pct}%` : "0%",
                    minHeight: d.amount > 0 ? "4px" : "0",
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              </div>
              <span className={`text-[10px] ${
                isToday ? "text-primary font-bold" : "text-muted-foreground"
              }`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
        <span>7 дн: <strong className="text-foreground">{revenue7}</strong></span>
        <span>30 дн: <strong className="text-foreground">{revenue30}</strong></span>
      </div>
    </Link>
  );
}
