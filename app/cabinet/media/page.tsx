"use client";

import { useState } from "react";
import { Images, FileText, Film, Upload } from "lucide-react";

export default function MyMediaPage() {
  const [tab, setTab] = useState<"all" | "photos" | "videos" | "docs">("all");

  const tabs = [
    { id: "all" as const, label: "Все", icon: Images },
    { id: "photos" as const, label: "Фото", icon: Images },
    { id: "videos" as const, label: "Видео", icon: Film },
    { id: "docs" as const, label: "Документы", icon: FileText },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">Медиабиблиотека</h1>
          <p className="text-xs text-muted-foreground mt-1">Ваши фото, видео и документы</p>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Пустое состояние */}
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <Images className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
        <p className="font-medium mb-1">Медиабиблиотека пуста</p>
        <p className="text-xs text-muted-foreground mb-4">Здесь будут собираться ваши фото из отзывов, документы заказов и другие файлы</p>
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-medium">
          <Upload className="w-4 h-4" />
          Скоро
        </div>
      </div>
    </div>
  );
}
