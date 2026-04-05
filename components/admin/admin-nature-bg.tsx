"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// ── Красивые CSS-градиенты вместо фото — грузятся мгновенно, никогда не ломаются ──
const DARK_GRADIENTS = [
  // Ночной лес
  "radial-gradient(ellipse at 20% 50%, #0a2a1a 0%, #030d08 50%, #000a14 100%)",
  // Северное сияние
  "radial-gradient(ellipse at 70% 30%, #003322 0%, #001a33 40%, #0a0014 100%)",
  // Горная ночь
  "radial-gradient(ellipse at 50% 80%, #0d1a2e 0%, #050e1a 50%, #000508 100%)",
  // Глубокий океан
  "radial-gradient(ellipse at 30% 20%, #001833 0%, #000d1a 50%, #001208 100%)",
];

const LIGHT_GRADIENTS = [
  // Утренний лес
  "radial-gradient(ellipse at 30% 60%, #c8e6c9 0%, #e8f5e9 40%, #b3d9e8 100%)",
  // Горное утро
  "radial-gradient(ellipse at 60% 30%, #cce0f0 0%, #e8f4f8 40%, #d4edda 100%)",
  // Рассвет над горами
  "radial-gradient(ellipse at 40% 70%, #dde8f0 0%, #eef5f8 40%, #c5dfc5 100%)",
  // Туманная долина
  "radial-gradient(ellipse at 50% 40%, #d0e8e0 0%, #eaf4f0 40%, #c8dce8 100%)",
];

// Поверх градиента — текстура/шум для глубины
const NOISE_DARK  = "rgba(0,0,0,0.25)";
const NOISE_LIGHT = "rgba(255,255,255,0.18)";

function guessIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const s = localStorage.getItem("theme");
    if (s === "light") return false;
    if (s === "dark")  return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return true; }
}

const SHOW_MS = 12_000;
const FADE_MS =  2_000;

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx]         = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [fading, setFading]   = useState(false);

  const isDark   = mounted ? resolvedTheme !== "light" : guessIsDark();
  const GRADS    = isDark ? DARK_GRADIENTS : LIGHT_GRADIENTS;
  const labels   = isDark
    ? ["Ночной лес", "Северное сияние", "Горная ночь", "Глубокий океан"]
    : ["Утренний лес", "Горное утро", "Рассвет над горами", "Туманная долина"];

  useEffect(() => { setMounted(true); }, []);

  // Сбрасываем при смене темы
  useEffect(() => {
    if (!mounted) return;
    setIdx(0); setNextIdx(1); setFading(false);
  }, [isDark, mounted]);

  // Автосмена
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      const n = (idx + 1) % GRADS.length;
      setNextIdx(n);
      setFading(true);
      setTimeout(() => { setIdx(n); setFading(false); }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, idx, GRADS.length]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* Текущий градиент */}
      <div className="absolute inset-0 transition-opacity"
        style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}>
        <div className="absolute inset-0"
          style={{ background: GRADS[idx], transition: `background ${FADE_MS}ms ease` }} />
        {/* Медленный zoom как Ken Burns */}
        <div className="absolute inset-[-8%]"
          style={{
            background: GRADS[idx],
            animation: `kenburns-in ${SHOW_MS}ms ease-in-out forwards`,
            willChange: "transform",
          }} />
      </div>

      {/* Следующий градиент */}
      <div className="absolute inset-0 transition-opacity"
        style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}>
        <div className="absolute inset-[-8%]"
          style={{
            background: GRADS[nextIdx],
            animation: `kenburns-2 ${SHOW_MS}ms ease-in-out forwards`,
            willChange: "transform",
          }} />
      </div>

      {/* ── Оверлеи для читаемости ── */}
      {/* Тёмная тема */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "rgba(0,0,0,0.38)" }} />
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.10) 40%, transparent 65%)" }} />
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 30%)" }} />

      {/* Светлая тема */}
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "rgba(255,255,255,0.12)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 50%)" }} />

      {/* Лейбл */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.22 }}>
        <span className="text-white text-[9px]">{isDark ? "🌙" : "☀️"}</span>
        <span className="w-px h-3 bg-white/60" />
        <span className="text-white text-[9px] tracking-[0.24em] uppercase font-light">
          {labels[idx]}
        </span>
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
      </div>
    </div>
  );
}
