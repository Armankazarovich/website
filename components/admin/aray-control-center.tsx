"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ImageIcon, Layers3, Palette, X } from "lucide-react";
import { useTheme } from "next-themes";
import { usePalette } from "@/components/palette-provider";
import type { AdminBgMode } from "@/components/admin/admin-atmosphere";
import { getPaletteAtmosphere } from "@/lib/admin-atmospheres";
import { PALETTES } from "@/lib/palettes";

const BG_MODE_KEY = "aray-bg-mode";

const BG_MODES: { id: AdminBgMode; label: string; icon: React.ElementType }[] = [
  { id: "clean", label: "Чистый", icon: Layers3 },
  { id: "photo", label: "Атмосфера", icon: ImageIcon },
];

function readBgMode(): AdminBgMode {
  if (typeof window === "undefined") return "clean";
  const stored = localStorage.getItem(BG_MODE_KEY);
  if (stored === "photo" || stored === "clean") return stored;
  if (stored === "video") {
    localStorage.setItem(BG_MODE_KEY, "photo");
    return "photo";
  }
  if (stored === "classic") return "clean";
  return "clean";
}

export function ArayControlCenter({ userRole, position = "bottom" }: { userRole?: string; position?: "bottom" | "right" }) {
  const [open, setOpen] = useState(false);
  const [bgMode, setBgModeState] = useState<AdminBgMode>("clean");
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const ref = useRef<HTMLDivElement>(null);

  // Mounted guard for hydration safety
  const [ccMounted, setCcMounted] = useState(false);
  useEffect(() => setCcMounted(true), []);
  const safeTheme = ccMounted ? theme : "dark";

  useEffect(() => {
    const sync = () => setBgModeState(readBgMode());
    sync();
    window.addEventListener("aray-classic-change", sync);
    return () => window.removeEventListener("aray-classic-change", sync);
  }, []);

  function setBgMode(mode: AdminBgMode) {
    setBgModeState(mode);
    localStorage.setItem(BG_MODE_KEY, mode);
    localStorage.setItem("aray-classic-mode", mode === "clean" ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  }

  function choosePalette(id: string) {
    setPalette(id);
    if (bgMode === "photo") {
      window.dispatchEvent(new Event("aray-classic-change"));
    }
  }

  // Закрытие по клику снаружи
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Сбрасываем кастомный font-size установленный старой системой,
  // чтобы вернуться к браузерному default 16px (как в магазине).
  // Сессия 39 (28.04.2026): убрали 5 уровней шрифта по просьбе Армана —
  // лишний переключатель, на магазине нет, читается отлично без них.
  useEffect(() => {
    document.documentElement.style.removeProperty("font-size");
    document.documentElement.style.removeProperty("--aray-font-scale");
    try {
      localStorage.removeItem("aray-font-size");
    } catch {}
  }, []);

  // ── Liquid Glass palette ─────────────────────────────────────────────────
  const isDark = safeTheme === "dark";
  const glass = {
    bg: isDark
      ? `linear-gradient(180deg, rgba(10,10,18,0.72), rgba(10,10,18,0.65))`
      : `linear-gradient(180deg, rgba(240,242,248,0.78), rgba(240,242,248,0.72))`,
    refraction: isDark
      ? `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 40%)`
      : `linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 40%)`,
    border: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.35)",
    borderInner: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    blur: "blur(50px) saturate(200%) brightness(1.05)",
    textPrimary: isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.88)",
    textSecondary: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    shadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.1)"
      : "0 8px 32px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.05)",
  };

  // ═══ RIGHT SIDE sticky layout (desktop + mobile) ═══════════════════════
  if (position === "right") {
    return (
      <div ref={ref} className="flex flex-col items-center gap-1">
        {/* Collapsed: single palette button */}
        {!open ? (
          <div className="flex flex-col items-center gap-1 px-1.5 py-3 rounded-l-2xl relative overflow-hidden"
            style={{
              background: glass.bg,
              backdropFilter: glass.blur,
              WebkitBackdropFilter: glass.blur,
              borderTop: `1px solid ${glass.border}`,
              borderBottom: `1px solid ${glass.border}`,
              borderLeft: `1px solid ${glass.border}`,
              boxShadow: glass.shadow,
            }}>
            <div className="absolute inset-0 pointer-events-none rounded-l-2xl" style={{ background: glass.refraction }} />
            <button onClick={() => setOpen(true)} title="Оформление" aria-label="Оформление"
              className="relative p-2.5 rounded-xl transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Palette className="w-4 h-4" style={{ color: glass.textSecondary }} />
            </button>
          </div>
        ) : (
          /* Expanded: style panel with Liquid Glass */
          <div className="w-[340px] max-w-[calc(100vw-72px)] rounded-l-2xl overflow-hidden animate-in slide-in-from-right-2 fade-in duration-200 relative"
            style={{
              background: glass.bg,
              backdropFilter: glass.blur,
              WebkitBackdropFilter: glass.blur,
              borderTop: `1px solid ${glass.border}`,
              borderBottom: `1px solid ${glass.border}`,
              borderLeft: `1px solid ${glass.border}`,
              boxShadow: glass.shadow,
            }}>
            <div className="absolute inset-0 pointer-events-none rounded-l-2xl" style={{ background: glass.refraction }} />
            {/* Header */}
            <div className="relative flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${glass.borderInner}` }}>
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold" style={{ color: glass.textPrimary }}>Оформление</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg transition-colors" aria-label="Закрыть"
                onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <X className="w-4 h-4" style={{ color: glass.textSecondary }} />
              </button>
            </div>
            {/* Content */}
            <div className="relative p-4 space-y-4">
              {/* Палитры */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: glass.textSecondary }}>Стиль и атмосфера</p>
                <div className="grid grid-cols-3 gap-2">
                  {PALETTES.map((p) => {
                    const atmosphere = getPaletteAtmosphere(p.id);
                    const active = palette === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => choosePalette(p.id)}
                        title={atmosphere ? `${p.name}: ${atmosphere.name}` : p.name}
                        className="group rounded-xl p-1.5 text-left transition-all"
                        style={{
                          background: active ? "hsl(var(--primary) / 0.16)" : glass.hoverBg,
                          border: `1px solid ${active ? p.accent : glass.borderInner}`,
                          boxShadow: active ? `0 10px 26px ${p.accent}22` : "none",
                        }}
                      >
                        <span className="relative block h-16 overflow-hidden rounded-lg bg-black/20">
                          {atmosphere && (
                            <img
                              src={atmosphere.src}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              style={{ opacity: isDark ? 0.72 : 0.88 }}
                            />
                          )}
                          <span
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.54)), linear-gradient(135deg, ${p.sidebar}44, ${p.accent}55)`,
                            }}
                          />
                          <span
                            className="absolute left-1.5 top-1.5 h-4 w-4 rounded-full border border-white/40 shadow"
                            style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                          />
                          {active && (
                            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-black shadow">
                              <Check className="h-3 w-3" strokeWidth={2.4} />
                            </span>
                          )}
                        </span>
                        <span className="mt-1.5 block min-w-0">
                          <span className="block truncate text-[11px] font-semibold leading-tight" style={{ color: active ? p.accent : glass.textPrimary }}>
                            {p.name}
                          </span>
                          <span className="block truncate text-[9px] font-medium leading-tight" style={{ color: glass.textSecondary }}>
                            {atmosphere?.shortName ?? "ARAY"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Тема */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: glass.textSecondary }}>Тема</p>
                <div className="flex gap-2">
                  {["light", "dark"].map((t) => (
                    <button key={t} onClick={() => setTheme(t)}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{
                        background: safeTheme === t ? "hsl(var(--primary))" : glass.hoverBg,
                        color: safeTheme === t ? "#fff" : glass.textSecondary,
                      }}>
                      {t === "light" ? "Светлая" : "Тёмная"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Фон */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: glass.textSecondary }}>Фон</p>
                <div className="grid grid-cols-2 gap-2">
                  {BG_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const active = bgMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setBgMode(mode.id)}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all"
                        style={{
                          background: active ? "hsl(var(--primary))" : glass.hoverBg,
                          color: active ? "#fff" : glass.textSecondary,
                        }}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                        <span className="text-[10px] font-semibold leading-none">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══ BOTTOM layout (fallback, not actively used) ═══════════════════════
  return null;
}
