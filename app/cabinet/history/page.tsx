"use client";

import { useState, useEffect } from "react";
import { History, ShoppingBag, Star, Eye, Loader2, LogIn, MousePointer } from "lucide-react";

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

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  VIEW_PRODUCT: { label: "Просмотр товара", icon: Eye, color: "text-blue-500" },
  PLACE_ORDER: { label: "Заказ", icon: ShoppingBag, color: "text-primary" },
  WRITE_REVIEW: { label: "Отзыв", icon: Star, color: "text-yellow-500" },
  LOGIN: { label: "Вход", icon: LogIn, color: "text-emerald-500" },
  PAGE_VISIT: { label: "Посещение", icon: MousePointer, color: "text-purple-500" },
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
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const statCards = [
    { key: "VIEW_PRODUCT", label: "Просмотры", icon: Eye, color: "text-blue-500" },
    { key: "PLACE_ORDER", label: "Заказы", icon: ShoppingBag, color: "text-primary" },
    { key: "WRITE_REVIEW", label: "Отзывы", icon: Star, color: "text-yellow-500" },
    { key: "LOGIN", label: "Входы", icon: LogIn, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="font-display font-bold text-xl">История</h1>
        <p className="text-xs text-muted-foreground mt-1">Ваши действия и посещения</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {statCards.map((s) => {
          const count = data?.stats[s.key] ?? 0;
          const isActive = filter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(isActive ? null : s.key)}
              className={`bg-card border rounded-2xl p-3 text-center transition-all ${
                isActive ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
              }`}
            >
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-display font-bold">{count}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Activity feed */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.logs.length ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <History className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="font-medium mb-1">История пуста</p>
          <p className="text-xs text-muted-foreground">
            Ваши действия будут записываться автоматически: просмотры товаров, заказы, отзывы
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {data.logs.map((log) => {
            const config = ACTION_CONFIG[log.action] || { label: log.action, icon: MousePointer, color: "text-muted-foreground" };
            const Icon = config.icon;
            const name = (log.meta as Record<string, string>)?.name || (log.meta as Record<string, string>)?.url || log.targetId || "";
            return (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
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
              <p className="text-xs text-muted-foreground">Показано {data.logs.length} из {data.total}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
