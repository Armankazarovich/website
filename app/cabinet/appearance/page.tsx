"use client";

import { useTheme } from "next-themes";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { useState, useEffect } from "react";
import { Sun, Moon, Check } from "lucide-react";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const safeTheme = theme || "dark";

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="font-display font-bold text-xl">Оформление</h1>
        <p className="text-xs text-muted-foreground mt-1">Настройте тему и цвета под себя</p>
      </div>

      {/* Режим */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-3">Режим</p>
        <div className="flex gap-3">
          {[
            { id: "light", label: "Светлая", icon: Sun },
            { id: "dark", label: "Тёмная", icon: Moon },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                safeTheme === t.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <t.icon className={`w-6 h-6 ${safeTheme === t.id ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${safeTheme === t.id ? "text-primary" : "text-muted-foreground"}`}>
                {t.label}
              </span>
              {safeTheme === t.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Цветовая тема */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-1">Цветовая тема</p>
        <p className="text-xs text-muted-foreground mb-4">Выберите палитру интерфейса</p>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border-2 transition-all ${
                palette === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div
                className="w-10 h-10 rounded-full shrink-0 relative"
                style={{
                  background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)`,
                }}
              >
                {palette === p.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
