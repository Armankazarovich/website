"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { Check, ImageIcon, Layers3, Monitor, Moon, Palette, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { AdminPaletteCard } from "@/components/admin/admin-palette-card";
import { usePalette } from "@/components/palette-provider";
import type { AdminBgMode } from "@/components/admin/admin-atmosphere";
import { ARAY_FOCUS_RING } from "@/lib/aray-design-tokens";
import { PALETTES } from "@/lib/palettes";

const BG_MODE_KEY = "aray-bg-mode";

const BG_MODES: { id: AdminBgMode; label: string; hint: string; icon: ElementType }[] = [
  { id: "photo", label: "Атмосфера", hint: "Фирменный фон ARAY", icon: ImageIcon },
  { id: "clean", label: "Чистый", hint: "Без фото, только интерфейс", icon: Layers3 },
];

const THEME_OPTIONS = [
  { id: "dark", label: "Темная", icon: Moon },
  { id: "light", label: "Светлая", icon: Sun },
  { id: "system", label: "Система", icon: Monitor },
] as const;

function readBgMode(): AdminBgMode {
  if (typeof window === "undefined") return "photo";
  const stored = localStorage.getItem(BG_MODE_KEY);
  if (stored === "photo" || stored === "clean") return stored;
  if (stored === "video") {
    localStorage.setItem(BG_MODE_KEY, "photo");
    return "photo";
  }
  if (stored === "classic") {
    localStorage.setItem(BG_MODE_KEY, "clean");
    return "clean";
  }
  return "photo";
}

export function ArayAppearancePanel({
  className = "",
  dense = false,
  showBackgroundControls = true,
}: {
  className?: string;
  dense?: boolean;
  showBackgroundControls?: boolean;
}) {
  const [bgMode, setBgModeState] = useState<AdminBgMode>("photo");
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
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

  const sectionTitleClass = dense
    ? "mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
    : "mb-2.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

  return (
    <div className={`${dense ? "space-y-3" : "space-y-4"} ${className}`}>
      {showBackgroundControls && (
        <section>
          <p className={sectionTitleClass}>Фон админки</p>
          <div className={`grid grid-cols-2 ${dense ? "gap-1.5" : "gap-2"}`}>
            {BG_MODES.map((mode) => {
              const Icon = mode.icon;
              const active = bgMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setBgMode(mode.id)}
                  aria-pressed={active}
                  className={`group flex items-center border text-left transition-all ${ARAY_FOCUS_RING} ${
                    dense ? "min-h-[3.25rem] gap-2.5 rounded-xl px-2.5" : "min-h-[3.75rem] gap-3 rounded-2xl px-3"
                  } ${
                    active
                      ? "border-primary/30 bg-primary/[0.09] text-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.07)]"
                      : "border-border/70 bg-card/40 text-foreground hover:border-primary/20 hover:bg-card/64"
                  }`}
                >
                  <span
                    className={`flex shrink-0 items-center justify-center ${dense ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl"} ${
                      active
                        ? "bg-primary/14 text-primary ring-1 ring-primary/18"
                        : isDark
                          ? "bg-white/[0.04] text-muted-foreground"
                          : "bg-muted/70 text-muted-foreground"
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
      )}

      <section>
        <p className={sectionTitleClass}>Тема</p>
        <div className={`grid grid-cols-3 ${dense ? "gap-1.5" : "gap-2"}`}>
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = theme === option.id || (!theme && option.id === "system");
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                aria-pressed={active}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 transition-all ${ARAY_FOCUS_RING} ${
                  dense ? "min-h-10" : "min-h-11"
                } ${
                  active
                    ? "border-primary/30 bg-primary/[0.09] text-primary"
                    : "border-border/70 bg-card/36 text-muted-foreground hover:border-primary/20 hover:bg-card/64 hover:text-foreground"
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
        <p className={sectionTitleClass}>Цвет интерфейса</p>
        <div className={`grid grid-cols-3 ${dense ? "gap-1.5" : "gap-2"}`}>
          {PALETTES.map((item) => {
            return (
              <AdminPaletteCard
                key={item.id}
                palette={item}
                active={palette === item.id}
                onClick={() => choosePalette(item.id)}
                title={`${item.name}: ${item.pairing}`}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ArayControlCenter({
  position = "header",
}: {
  userRole?: string;
  position?: "header" | "bottom" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (position === "bottom") return null;

  const panelClassName =
    position === "right"
      ? "fixed right-3 top-[4.5rem] z-[80] w-[23.5rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5.5rem)]"
      : "absolute right-0 top-[calc(100%+0.55rem)] z-[80] w-[23.5rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5.5rem)]";

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
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.65)]" />
      </button>

      {open && (
        <div
          className={`${panelClassName} animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden rounded-2xl border admin-popup-liquid shadow-2xl`}
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
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Фон, тема и атмосфера</p>
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

          <ArayAppearancePanel className="max-h-[calc(100dvh-10.5rem)] overflow-y-auto p-4" />
        </div>
      )}
    </div>
  );
}
