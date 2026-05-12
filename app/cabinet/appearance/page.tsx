"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePalette } from "@/components/palette-provider";
import { PALETTES } from "@/lib/palettes";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const safeTheme = mounted ? theme || "dark" : "dark";

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="font-display font-bold text-xl">Оформление</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Настройте тему и цвета под себя
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-3">Режим</p>
        <div className="flex gap-3">
          {[
            { id: "light", label: "Светлая", icon: Sun },
            { id: "dark", label: "Темная", icon: Moon },
          ].map((item) => {
            const active = safeTheme === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`flex-1 flex flex-col items-center gap-2 min-h-[104px] py-4 rounded-2xl border-2 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${active ? "text-primary" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-sm font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {item.label}
                </span>
                {active && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-1">Цветовая тема</p>
        <p className="text-xs text-muted-foreground mb-4">
          Выберите палитру интерфейса
        </p>

        <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {PALETTES.map((item) => {
            const active = palette === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPalette(item.id)}
                className={`group flex flex-col gap-2 rounded-2xl border-2 p-2 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span
                  className="relative block h-16 w-full overflow-hidden rounded-xl border border-white/10 bg-muted"
                  style={{
                    background: `linear-gradient(135deg, ${item.sidebar}, ${item.accent})`,
                  }}
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
                    style={{
                      background: `linear-gradient(135deg, ${item.sidebar} 50%, ${item.accent} 50%)`,
                    }}
                  />
                  {active && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black shadow">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 text-center">
                  <span
                    className={`block min-h-[1.75rem] text-[11px] font-semibold leading-tight ${
                      active ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="block text-xs font-medium leading-tight text-muted-foreground">
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
