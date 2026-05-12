"use client";

/**
 * DashboardChart — график выручки за 7 дней.
 *
 * Сессия 40 (28.04.2026): переписан под calm UI магазина.
 *  - bg-card border-border rounded-2xl вместо aray-stat-card
 *  - Высота столбцов больше (h-32 sm:h-40), толщина чище
 *  - Bottom-row (7 дн / 30 дн) сохранён
 */
import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";
import { ARAY_ICON_TONE } from "@/lib/aray-design-tokens";

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
  const maxAmount = Math.max(...days.map((d) => d.amount), 1);
  const hasData = days.some((d) => d.amount > 0);

  return (
    <Link
      href="/admin/analytics"
      prefetch
      className="admin-liquid-surface group block rounded-2xl p-4 sm:p-5 min-w-0 transition-colors hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
    >
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-5 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`${ARAY_ICON_TONE} w-9 h-9 rounded-xl flex items-center justify-center shrink-0`}>
            <BarChart3 className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground leading-tight">
              Выручка за 7 дней
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              По дням, без отменённых
            </p>
          </div>
        </div>
        <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all shrink-0">
          Аналитика <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Chart */}
      <div className={`${hasData ? "h-32 sm:h-40" : "h-20 sm:h-24"} min-w-0`}>
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/25 px-4 text-center text-xs text-muted-foreground">
            Пока нет продаж. Начни с терминала или проверь готовность каталога.
          </div>
        ) : (
          <div className="flex h-full items-end gap-1.5 sm:gap-2">
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
                    : "text-muted-foreground opacity-70"
                }`}
              >
                {d.amount > 0 ? `${Math.round(d.amount / 1000)}к` : ""}
              </span>
              <div className="relative flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                    isToday
                      ? "bg-primary"
                      : "bg-primary/20 group-hover:bg-primary/35"
                  }`}
                  style={{
                    height: `${pct}%`,
                    minHeight: d.amount > 0 ? "4px" : "0",
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
        )}
      </div>

      {/* Footer summary */}
      <div className="mt-4 pt-4 border-t border-border flex flex-col xs:flex-row xs:justify-between gap-1.5 text-xs">
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
