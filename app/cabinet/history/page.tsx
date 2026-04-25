"use client";

import { useState, useEffect } from "react";
import { History, ShoppingBag, Star, Eye, LogIn, MousePointer } from "lucide-react";
import { SkeletonList } from "@/components/cabinet/skeleton";

type ActivityItem = {
  id: string;
  action: string;
  targetId?: string | null;
  meta?: Record<string, string> | null;
  createdAt: string;
};

type HistoryData = {
  logs: ActivityItem[];
  total: number;
  stats: Record<string, number>;
};

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Eye }> = {
  VIEW_PRODUCT: { label: "Просмотр товара", icon: Eye },
  PLACE_ORDER: { label: "Заказ", icon: ShoppingBag },
  WRITE_REVIEW: { label: "Отзыв", icon: Star },
  LOGIN: { label: "Вход", icon: LogIn },
  PAGE_VISIT: { label: "Посещение", icon: MousePointer },
  CANCEL_ORDER: { label: "Отмена заказа", icon: ShoppingBag },
};

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return new Date(date).toLocaleDateString("ru-RU");
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const load = (action?: string | null) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    fetch(`/api/cabinet/history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const statCards = [
    { key: "VIEW_PRODUCT", label: "Просмотры", icon: Eye },
    { key: "PLACE_ORDER", label: "Заказы", icon: ShoppingBag },
    { key: "WRITE_REVIEW", label: "Отзывы", icon: Star },
    { key: "LOGIN", label: "Входы", icon: LogIn },
  ];

  const totalActivity = Object.values(data?.stats || {}).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-4 pb-4 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-xl">История</h1>
        <p className="text-xs text-muted-foreground mt-1">Ваши действия и посещения</p>
      </div>

      {/* Stats — фильтры. Активный — primary, остальные — нейтральные */}
      {totalActivity > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {statCards.map((s) => {
            const count = data?.stats[s.key] ?? 0;
            const isActive = filter === s.key;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setFilter(isActive ? null : s.key)}
                className={`bg-card border rounded-2xl p-3 text-center transition-colors ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Icon
                  className={`w-4 h-4 mx-auto mb-1 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <p className="text-lg font-display font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Activity feed */}
      {loading ? (
        <SkeletonList count={5} />
      ) : !data?.logs.length ? (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <History className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">
            {filter ? "Здесь пока ничего нет" : "История пуста"}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {filter
              ? "Попробуйте другой фильтр или сбросьте"
              : "Ваши действия будут записываться автоматически: просмотры товаров, заказы, отзывы"}
          </p>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="mt-4 inline-flex items-center gap-2 px-5 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              Сбросить фильтр
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {data.logs.map((log) => {
            const config = ACTION_CONFIG[log.action] || {
              label: log.action,
              icon: MousePointer,
            };
            const Icon = config.icon;
            const name =
              (log.meta as Record<string, string>)?.name ||
              (log.meta as Record<string, string>)?.url ||
              log.targetId ||
              "";
            return (
              <div key={log.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{config.label}</p>
                  {name && <p className="text-xs text-muted-foreground truncate">{name}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatRelative(log.createdAt)}
                </span>
              </div>
            );
          })}
          {data.total > data.logs.length && (
            <div className="p-3 text-center">
              <p className="text-xs text-muted-foreground">
                Показано {data.logs.length} из {data.total}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
