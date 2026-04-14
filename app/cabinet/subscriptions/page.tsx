"use client";

import { Heart, Users, Bell } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="font-display font-bold text-xl">Подписки</h1>
        <p className="text-xs text-muted-foreground mt-1">Ваши подписки и подписчики</p>
      </div>

      {/* Табы */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Подписки", value: "0", icon: Heart, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" },
          { label: "Подписчики", value: "0", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Уведомления", value: "0", icon: Bell, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-4 text-center`}>
            <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
            <p className="text-xl font-display font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Пустое состояние */}
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <Heart className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
        <p className="font-medium mb-1">Подписок пока нет</p>
        <p className="text-xs text-muted-foreground">Подпишитесь на поставщиков и магазины чтобы получать обновления</p>
      </div>
    </div>
  );
}
