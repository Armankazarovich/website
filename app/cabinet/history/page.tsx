"use client";

import { History, ExternalLink, ShoppingBag, Star, Eye } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="font-display font-bold text-xl">История</h1>
        <p className="text-xs text-muted-foreground mt-1">Ваши действия и посещения</p>
      </div>

      {/* Типы действий */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Просмотры", value: "—", icon: Eye, color: "text-blue-500" },
          { label: "Заказы", value: "—", icon: ShoppingBag, color: "text-primary" },
          { label: "Отзывы", value: "—", icon: Star, color: "text-yellow-500" },
          { label: "Визиты", value: "—", icon: ExternalLink, color: "text-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-display font-bold">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Пустое состояние */}
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <History className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
        <p className="font-medium mb-1">История пуста</p>
        <p className="text-xs text-muted-foreground">Здесь будет отображаться ваша активность: просмотры товаров, заказы, отзывы и посещённые страницы</p>
      </div>
    </div>
  );
}
