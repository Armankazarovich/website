"use client";

import { useState, useEffect } from "react";
import { Heart, Loader2, Trash2, Store, Tag, Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SkeletonList } from "@/components/cabinet/skeleton";

type Sub = {
  id: string;
  targetType: string;
  targetId: string;
  targetName: string;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  category: "Категория",
  brand: "Бренд",
};

const TYPE_ICONS: Record<string, typeof Store> = {
  supplier: Store,
  category: Tag,
  brand: Package,
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
    { label: "Подписки", value: subs.length },
    { label: "Поставщики", value: subs.filter((s) => s.targetType === "supplier").length },
    { label: "Категории", value: subs.filter((s) => s.targetType === "category").length },
  ];

  return (
    <div className="space-y-4 pb-4 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-xl">Подписки</h1>
        <p className="text-xs text-muted-foreground mt-1">Управление вашими подписками</p>
      </div>

      {/* Stats — показываем только когда есть подписки */}
      {!loading && subs.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-xl font-display font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : subs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">Подписок пока нет</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-md mx-auto">
            Подпишитесь на категории на странице каталога — будете первыми узнавать о новинках и скидках
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 h-11 rounded-xl text-sm font-semibold hover:brightness-110 transition-all"
          >
            В каталог <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {subs.map((sub) => {
            const Icon = TYPE_ICONS[sub.targetType] || Heart;
            const label = TYPE_LABELS[sub.targetType] || sub.targetType;
            return (
              <div key={sub.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.targetName}</p>
                  <p className="text-xs text-muted-foreground">
                    {label} · {new Date(sub.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <button
                  onClick={() => unsubscribe(sub.id)}
                  disabled={removing === sub.id}
                  aria-label="Отписаться"
                  className="text-muted-foreground hover:text-destructive transition-colors p-2"
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
