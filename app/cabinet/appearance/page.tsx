"use client";

import { useTheme } from "next-themes";
import { usePalette } from "@/components/palette-provider";
import { useState, useEffect } from "react";
import { Sun, Moon, Check } from "lucide-react";
import { PALETTES } from "@/lib/palettes";

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

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {PALETTES.map((p) => {
            const active = palette === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                className={`group flex flex-col gap-2 rounded-2xl border-2 p-2 transition-all ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span
                  className="relative block h-16 w-full overflow-hidden rounded-xl border border-white/10 bg-muted"
                  style={{ background: `linear-gradient(135deg, ${p.sidebar}, ${p.accent})` }}
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(0,0,0,0.24)), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.34), transparent 34%)",
                    }}
                  />
                  <span
                    className="absolute left-2 top-2 h-5 w-5 rounded-full border border-white/50 shadow"
                    style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                  />
                  {active && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black shadow">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 text-center">
                  <span className={`block truncate text-[11px] font-semibold leading-tight ${active ? "text-primary" : "text-foreground"}`}>
                    {p.name}
                  </span>
                  <span className="block truncate text-[9px] font-medium leading-tight text-muted-foreground">
                    Интерфейс
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
