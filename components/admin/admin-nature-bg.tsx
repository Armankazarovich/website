"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

// ── 12 дневных фото: природа + города ────────────────────────────────────────
const DAY: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop", label: "Горные вершины" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85&auto=format&fit=crop", label: "Дремучий лес" },
  { url: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920&q=85&auto=format&fit=crop", label: "Париж днём" },
  { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=85&auto=format&fit=crop", label: "Водопад" },
  { url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=85&auto=format&fit=crop", label: "Город в облаках" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85&auto=format&fit=crop", label: "Альпы" },
  { url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=85&auto=format&fit=crop", label: "Лондон" },
  { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=85&auto=format&fit=crop", label: "Океан" },
  { url: "https://images.unsplash.com/photo-1448375240703-89f2b795f098?w=1920&q=85&auto=format&fit=crop", label: "Туманный лес" },
  { url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920&q=85&auto=format&fit=crop", label: "Нью-Йорк" },
  { url: "https://images.unsplash.com/photo-1491555103944-7c89fc6e1e65?w=1920&q=85&auto=format&fit=crop", label: "Снежные горы" },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=85&auto=format&fit=crop", label: "Токио" },
];

// ── 12 ночных фото: природа + ночные города ──────────────────────────────────
const NIGHT: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1419242902344-4b9f4c242d08?w=1920&q=85&auto=format&fit=crop", label: "Млечный путь" },
  { url: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=85&auto=format&fit=crop", label: "Токио ночью" },
  { url: "https://images.unsplash.com/photo-1480497490-fa5c5aff5051?w=1920&q=85&auto=format&fit=crop", label: "Горный закат" },
  { url: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920&q=85&auto=format&fit=crop&sat=-100&bri=-20", label: "Ночной Париж" },
  { url: "https://images.unsplash.com/photo-1516912799-8f4ec627d5f4?w=1920&q=85&auto=format&fit=crop", label: "Северное сияние" },
  { url: "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1920&q=85&auto=format&fit=crop", label: "Огни города" },
  { url: "https://images.unsplash.com/photo-1445905595283-21f8ae8a33d2?w=1920&q=85&auto=format&fit=crop", label: "Ночные горы" },
  { url: "https://images.unsplash.com/photo-1538970272646-f61fabb3bfab?w=1920&q=85&auto=format&fit=crop", label: "Нью-Йорк ночью" },
  { url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1920&q=85&auto=format&fit=crop", label: "Горное озеро" },
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop&bri=-30", label: "Ночные вершины" },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=85&auto=format&fit=crop", label: "Звёздное небо" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=85&auto=format&fit=crop", label: "Ночной горизонт" },
];

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];
const SHOW_MS = 22_000; // 22 сек — достаточно долго чтобы насладиться
const FADE_MS =  4_000; // 4 сек crossfade — кинематографично

// Предугадываем тему ДО гидрации — читаем из localStorage напрямую
function guessIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light") return false;
    if (stored === "dark")  return true;
    // system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return true; }
}

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // До гидрации — угадываем тему из localStorage, чтобы не было мигания
  const isDark = mounted ? resolvedTheme !== "light" : guessIsDark();
  const PHOTOS = isDark ? NIGHT : DAY;

  const [cur,    setCur]    = useState(0);
  const [next,   setNext]   = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const prevIsDark = useRef(isDark);

  useEffect(() => { setMounted(true); }, []);

  // При смене темы — плавный переход и сброс на первое фото
  useEffect(() => {
    if (!mounted) return;
    if (isDark !== prevIsDark.current) {
      prevIsDark.current = isDark;
      setFading(true);
      setTimeout(() => {
        setCur(0);
        setNext(1);
        setFailed(new Set());
        setFading(false);
      }, FADE_MS);
    }
  }, [isDark, mounted]);

  // Автоматическая смена фото
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      setFading(true);
      const n = (cur + 1) % PHOTOS.length;
      setNext(n);
      setTimeout(() => { setCur(n); setFading(false); }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, cur, PHOTOS.length]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* Текущее фото */}
      {!failed.has(cur) && (
        <div className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}>
          <img
            src={PHOTOS[cur].url} alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[cur % 3]} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, cur]))}
          />
        </div>
      )}

      {/* Следующее фото — предзагрузка в фоне */}
      {!failed.has(next) && (
        <div className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}>
          <img
            src={PHOTOS[next].url} alt=""
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[next % 3]} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, next]))}
          />
        </div>
      )}

      {/* Скрытая предзагрузка СЛЕДУЮЩЕГО следующего фото */}
      {(() => {
        const preload = (cur + 2) % PHOTOS.length;
        return !failed.has(preload) ? (
          <img key={preload} src={PHOTOS[preload].url} alt=""
            decoding="async" fetchPriority="low"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
          />
        ) : null;
      })()}

      {/* ── Оверлеи ────────────────────────────────────────────── */}

      {/* Базовое затемнение */}
      <div className="aray-photo-overlay-dark  absolute inset-0 bg-black/55" />
      <div className="aray-photo-overlay-light absolute inset-0 bg-black/[0.08]" />

      {/* Цветной тинт палитры — "погода по цвету" ☀️❄️🌿 */}
      {/* Тёмная тема: насыщенный тинт */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.35)", mixBlendMode: "color" }} />
      {/* Светлая тема: мягкий тёплый тинт */}
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.28)", mixBlendMode: "color" }} />
      {/* Второй слой — усиливает настроение через soft-light */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.12)", mixBlendMode: "soft-light" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.10)", mixBlendMode: "soft-light" }} />

      {/* Виньетка снизу */}
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 38%, transparent 62%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 48%)" }} />

      {/* Виньетка сверху (тёмная тема) */}
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 28%)" }} />

      {/* Лейбл — тема как день/ночь */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.28 }}>
        <span className="text-white text-[9px]">{isDark ? "🌙" : "☀️"}</span>
        <span className="w-px h-3 bg-white/60" />
        <span className="text-white text-[9px] tracking-[0.24em] uppercase font-light">
          {PHOTOS[cur]?.label}
        </span>
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
      </div>

    </div>
  );
}
