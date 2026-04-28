"use client";

/**
 * DashboardChart — график выручки за 7 дней.
 *
 * Сессия 40 (28.04.2026): переписан под calm UI магазина.
 *  - bg-card border-border rounded-2xl вместо aray-stat-card
 *  - Высота столбцов больше (h-32 sm:h-40), толщина чище
 *  - Tooltip всегда видим над сегодняшним столбцом
 *  - Bottom-row (7 дн / 30 дн) сохранён
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";

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
    const t = setTimeout(() => setAnimated(true), 250);
    return () => clearTimeout(t);
  }, []);

  const maxAmount = Math.max(...days.map((d) => d.amount), 1);

  return (
    <Link
      href="/admin/analytics"
      className="group block bg-card border border-border rounded-2xl p-5 active:scale-[0.99] transition-all duration-200 hover:border-primary/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-display font-semibold text-sm text-foreground leading-tight">
              Выручка за 7 дней
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              По дням, без отменённых
            </p>
          </div>
        </div>
        <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all">
          Аналитика <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-2 h-32 sm:h-40">
        {days.map((d, i) => {
          const pct = Math.max((d.amount / maxAmount) * 100, d.amount > 0 ? 5 : 0);
          const isToday = i === days.length - 1;
          return (
            <div key={d.label + i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              {/* Amount label (top) */}
              <span
                className={`text-[10px] font-medium leading-none transition-opacity ${
                  isToday
                    ? "text-primary opacity-100"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100"
                }`}
              >
                {d.amount > 0 ? `${Math.round(d.amount / 1000)}к` : ""}
              </span>
              <div className="relative flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                    isToday
                      ? "bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
                      : "bg-primary/20 group-hover:bg-primary/35"
                  }`}
                  style={{
                    height: animated ? `${pct}%` : "0%",
                    minHeight: d.amount > 0 ? "4px" : "0",
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              </div>
              <span
                className={`text-[10px] capitalize ${
                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs">
        <span className="text-muted-foreground">
          7 дней:{" "}
          <strong className="text-foreground font-semibold">{revenue7}</strong>
        </span>
        <span className="text-muted-foreground">
          30 дней:{" "}
          <strong className="text-foreground font-semibold">{revenue30}</strong>
        </span>
      </div>
    </Link>
  );
}
