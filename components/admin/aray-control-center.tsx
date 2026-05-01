"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { Check, ImageIcon, Layers3, Monitor, Moon, Palette, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { AdminPaletteCard } from "@/components/admin/admin-palette-card";
import { usePalette } from "@/components/palette-provider";
import type { AdminBgMode } from "@/components/admin/admin-atmosphere";
import { ARAY_FOCUS_RING } from "@/lib/aray-design-tokens";
import { getPaletteAtmosphere } from "@/lib/admin-atmospheres";
import { PALETTES } from "@/lib/palettes";

const BG_MODE_KEY = "aray-bg-mode";

const BG_MODES: { id: AdminBgMode; label: string; hint: string; icon: ElementType }[] = [
  { id: "clean", label: "Чистый", hint: "Рабочий интерфейс", icon: Layers3 },
  { id: "photo", label: "Фото-фон", hint: "Опция для настроения", icon: ImageIcon },
];

const THEME_OPTIONS = [
  { id: "dark", label: "Темная", icon: Moon },
  { id: "light", label: "Светлая", icon: Sun },
  { id: "system", label: "Система", icon: Monitor },
] as const;

function readBgMode(): AdminBgMode {
  if (typeof window === "undefined") return "clean";
  const stored = localStorage.getItem(BG_MODE_KEY);
  if (stored === "photo" || stored === "clean") return stored;
  if (stored === "video") {
    localStorage.setItem(BG_MODE_KEY, "clean");
    return "clean";
  }
  if (stored === "classic") {
    localStorage.setItem(BG_MODE_KEY, "clean");
    return "clean";
  }
  return "clean";
}

export function ArayControlCenter({
  position = "header",
}: {
  userRole?: string;
  position?: "header" | "bottom" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [bgMode, setBgModeState] = useState<AdminBgMode>("clean");
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const ref = useRef<HTMLDivElement>(null);
  const safeTheme = mounted ? resolvedTheme || theme || "dark" : "dark";
  const isDark = safeTheme === "dark";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const sync = () => setBgModeState(readBgMode());
    sync();
    window.addEventListener("aray-classic-change", sync);
    return () => window.removeEventListener("aray-classic-change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };

    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeByEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeByEscape);
    };
  }, [open]);

  useEffect(() => {
    document.documentElement.style.removeProperty("font-size");
    document.documentElement.style.removeProperty("--aray-font-scale");
    try {
      localStorage.removeItem("aray-font-size");
    } catch {}
  }, []);

  function setBgMode(mode: AdminBgMode) {
    setBgModeState(mode);
    localStorage.setItem(BG_MODE_KEY, mode);
    localStorage.setItem("aray-classic-mode", mode === "clean" ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  }

  function choosePalette(id: string) {
    setPalette(id);
    window.dispatchEvent(new Event("aray-classic-change"));
  }

  if (position === "bottom") return null;

  const panelClassName = "admin-control-popover";

  return (
    <div ref={ref} className={position === "right" ? "relative" : "relative shrink-0"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Оформление"
        title="Оформление"
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground ${open ? "bg-primary/10 text-primary" : ""} ${ARAY_FOCUS_RING}`}
      >
        <Palette className="h-[18px] w-[18px]" strokeWidth={1.75} />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
      </button>

      {open && (
        <div
          className={`${panelClassName} animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden rounded-2xl border admin-popup-liquid`}
          data-placement={position}
          role="dialog"
          aria-label="Оформление интерфейса"
        >
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/18">
                <Palette className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-foreground">Оформление</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Тема, палитра и фон</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground ${ARAY_FOCUS_RING}`}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="max-h-[calc(100dvh-10.5rem)] space-y-4 overflow-y-auto p-4">
            <section>
              <p className="mb-2.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Фон админки
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BG_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = bgMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setBgMode(mode.id)}
                      className={`group flex min-h-[4.25rem] items-center gap-3 rounded-2xl border px-3 text-left transition-all ${ARAY_FOCUS_RING} ${
                        active
                          ? "border-primary/35 bg-primary/12 text-foreground"
                          : "border-border bg-card/55 text-foreground hover:border-primary/24 hover:bg-primary/8"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : isDark
                              ? "bg-white/[0.055] text-muted-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold leading-tight">{mode.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">{mode.hint}</span>
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="mb-2.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Тема
              </p>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = theme === option.id || (!theme && option.id === "system");
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id)}
                      className={`flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 transition-all ${ARAY_FOCUS_RING} ${
                        active
                          ? "border-primary/35 bg-primary/12 text-primary"
                          : "border-border bg-card/50 text-muted-foreground hover:border-primary/24 hover:bg-primary/8 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                      <span className="text-[10px] font-semibold leading-none">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="mb-2.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Палитра
              </p>
              <p className="mb-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
                Палитра меняет акцент и базовые цвета. Фото-фон можно включить отдельно.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PALETTES.map((item) => {
                  const atmosphere = getPaletteAtmosphere(item.id);
                  return (
                    <AdminPaletteCard
                      key={item.id}
                      palette={item}
                      atmosphere={atmosphere}
                      active={palette === item.id}
                      onClick={() => choosePalette(item.id)}
                      title={atmosphere ? `${item.name}: ${atmosphere.name}` : item.name}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
