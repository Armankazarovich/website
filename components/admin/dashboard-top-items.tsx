"use client";

/**
 * DashboardTopItems — топ товаров за всё время.
 *
 * Сессия 40 (28.04.2026): переписан под calm UI.
 *  - bg-card border-border rounded-2xl вместо aray-stat-card
 *  - Иконка в кружке слева вместо AdminSectionTitle
 *  - Skeleton-загрузка осталась, но в новом стиле
 */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Package, ChevronRight, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface TopItem {
  productName: string;
  totalPrice: number;
  count: number;
}

export function DashboardTopItems() {
  const [items, setItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard/top-items", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setLastUpdate(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 30_000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  if (!loading && items.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Package className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground leading-tight">
              Топ товаров
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
              По выручке за всё время
              {lastUpdate && (
                <span className="hidden sm:inline">
                  <span className="mx-1">·</span>
                  {lastUpdate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchItems}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
            title="Обновить"
            aria-label="Обновить"
            type="button"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
          </button>
          <Link
            href="/admin/analytics"
            className="text-xs text-primary flex items-center gap-0.5 hover:gap-1 transition-all"
          >
            Подробнее <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      <div className="divide-y divide-border">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                <div className="w-5 h-3 bg-muted rounded" />
                <div className="flex-1 h-3 bg-muted rounded" />
                <div className="w-16 h-3 bg-muted rounded" />
              </div>
            ))
          : items.map((item, i) => (
              <div
                key={item.productName}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
              >
                <span className="w-5 text-center text-xs font-bold text-muted-foreground/60 tabular-nums">
                  {i + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-foreground truncate">
                  {item.productName}
                </p>
                <p className="text-sm font-bold shrink-0 text-primary tabular-nums">
                  {formatPrice(item.totalPrice)}
                </p>
              </div>
            ))}
      </div>
    </div>
  );
}
