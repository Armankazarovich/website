"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, X } from "lucide-react";
import { useTheme } from "next-themes";
import { usePalette, PALETTES } from "@/components/palette-provider";

export function ArayControlCenter({ userRole, position = "bottom" }: { userRole?: string; position?: "bottom" | "right" }) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const ref = useRef<HTMLDivElement>(null);

  // Mounted guard for hydration safety
  const [ccMounted, setCcMounted] = useState(false);
  useEffect(() => setCcMounted(true), []);
  const safeTheme = ccMounted ? theme : "dark";

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
              border: `1px solid ${glass.border}`,
              borderRight: "none",
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
          <div className="w-[260px] rounded-l-2xl overflow-hidden animate-in slide-in-from-right-2 fade-in duration-200 relative"
            style={{
              background: glass.bg,
              backdropFilter: glass.blur,
              WebkitBackdropFilter: glass.blur,
              border: `1px solid ${glass.border}`,
              borderRight: "none",
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
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: glass.textSecondary }}>Палитра</p>
                <div className="flex flex-wrap gap-2">
                  {PALETTES.map((p) => (
                    <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                      className={`w-8 h-8 rounded-full shrink-0 transition-all ${palette === p.id ? "ring-2 ring-offset-1 ring-offset-transparent scale-110" : "opacity-60 hover:opacity-100 hover:scale-105"}`}
                      style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
                  ))}
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
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══ BOTTOM layout (fallback, not actively used) ═══════════════════════
  return null;
}
