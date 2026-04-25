"use client";

import { useState, useEffect } from "react";
import { Heart, Loader2, Trash2, Store, Tag, Package } from "lucide-react";
import { SkeletonList, SkeletonStats } from "@/components/cabinet/skeleton";

type Sub = {
  id: string;
  targetType: string;
  targetId: string;
  targetName: string;
  createdAt: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Store; color: string }> = {
  supplier: { label: "Поставщик", icon: Store, color: "text-blue-500" },
  category: { label: "Категория", icon: Tag, color: "text-purple-500" },
  brand: { label: "Бренд", icon: Package, color: "text-emerald-500" },
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cabinet/subscriptions")
      .then((r) => r.json())
      .then((d) => { setSubs(d.subscriptions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const unsubscribe = async (id: string) => {
    setRemoving(id);
    await fetch("/api/cabinet/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSubs((prev) => prev.filter((s) => s.id !== id));
    setRemoving(null);
  };

  const stats = [
    { label: "Подписки", value: subs.length, icon: Heart, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" },
    { label: "Поставщики", value: subs.filter((s) => s.targetType === "supplier").length, icon: Store, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Категории", value: subs.filter((s) => s.targetType === "category").length, icon: Tag, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="font-display font-bold text-xl">Подписки</h1>
        <p className="text-xs text-muted-foreground mt-1">Управление вашими подписками</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-4 text-center`}>
            <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
            <p className="text-xl font-display font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : subs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Heart className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="font-medium mb-1">Подписок пока нет</p>
          <p className="text-xs text-muted-foreground">
            Подпишитесь на категории товаров или поставщиков чтобы получать уведомления о новинках и скидках
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {subs.map((sub) => {
            const config = TYPE_CONFIG[sub.targetType] || { label: sub.targetType, icon: Heart, color: "text-muted-foreground" };
            const Icon = config.icon;
            return (
              <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.targetName}</p>
                  <p className="text-[10px] text-muted-foreground">{config.label} · {new Date(sub.createdAt).toLocaleDateString("ru-RU")}</p>
                </div>
                <button
                  onClick={() => unsubscribe(sub.id)}
                  disabled={removing === sub.id}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  {removing === sub.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
