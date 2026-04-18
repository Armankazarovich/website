"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Package, ChevronRight, RefreshCw } from "lucide-react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
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
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchItems, 30_000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  if (!loading && items.length === 0) return null;

  return (
    <div className="aray-stat-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
        <AdminSectionTitle icon={Package} title="Топ товаров" className="mb-0" />
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              {lastUpdate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchItems}
            className="text-muted-foreground hover:text-primary transition-colors arayglass-icon"
            title="Обновить"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/admin/analytics" className="text-xs text-primary flex items-center gap-0.5">
            Подробнее <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <div className="divide-y divide-border/30">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                <div className="w-5 h-3 bg-muted rounded" />
                <div className="flex-1 h-3 bg-muted rounded" />
                <div className="w-16 h-3 bg-muted rounded" />
              </div>
            ))
          : items.map((item, i) => (
              <div key={item.productName} className="flex items-center gap-3 px-5 py-3 hover:bg-primary/[0.04] transition-colors">
                <span className="w-5 text-center text-xs font-bold text-muted-foreground/60">{i + 1}</span>
                <p className="flex-1 text-sm font-medium truncate">{item.productName}</p>
                <p className="text-sm font-bold shrink-0 text-primary">{formatPrice(item.totalPrice)}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
