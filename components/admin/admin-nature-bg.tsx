"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

// ── 8 кинематографичных дневных фото ─────────────────────────────────────────
const DAY: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop", label: "Горные вершины" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85&auto=format&fit=crop", label: "Дремучий лес" },
  { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=85&auto=format&fit=crop", label: "Океан" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85&auto=format&fit=crop", label: "Альпы" },
  { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=85&auto=format&fit=crop", label: "Водопад" },
  { url: "https://images.unsplash.com/photo-1491555103944-7c89fc6e1e65?w=1920&q=85&auto=format&fit=crop", label: "Снежные горы" },
  { url: "https://images.unsplash.com/photo-1476673479940-e2f5bf9239be?w=1920&q=85&auto=format&fit=crop", label: "Морские волны" },
  { url: "https://images.unsplash.com/photo-1448375240703-89f2b795f098?w=1920&q=85&auto=format&fit=crop", label: "Туманный лес" },
];

// ── 8 кинематографичных ночных фото ──────────────────────────────────────────
const NIGHT: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1419242902344-4b9f4c242d08?w=1920&q=85&auto=format&fit=crop", label: "Млечный путь" },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=85&auto=format&fit=crop", label: "Звёздное небо" },
  { url: "https://images.unsplash.com/photo-1480497490-fa5c5aff5051?w=1920&q=85&auto=format&fit=crop", label: "Горный закат" },
  { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=85&auto=format&fit=crop", label: "Ночной пляж" },
  { url: "https://images.unsplash.com/photo-1445905595283-21f8ae8a33d2?w=1920&q=85&auto=format&fit=crop", label: "Ночные горы" },
  { url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1920&q=85&auto=format&fit=crop", label: "Горное озеро" },
  { url: "https://images.unsplash.com/photo-1455218873509-8ef305a30235?w=1920&q=85&auto=format&fit=crop", label: "Закат над горами" },
  { url: "https://images.unsplash.com/photo-1516912799-8f4ec627d5f4?w=1920&q=85&auto=format&fit=crop", label: "Северное сияние" },
];

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];
const SHOW_MS = 22_000; // 22 сек — достаточно долго чтобы насладиться
const FADE_MS =  4_000; // 4 сек crossfade — кинематографично

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const PHOTOS = isDark ? NIGHT : DAY;

  const [cur,    setCur]    = useState(0);
  const [next,   setNext]   = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const prevDark = useRef(isDark);

  // Плавная смена при переключении темы
  useEffect(() => {
    if (prevDark.current === isDark) return;
    prevDark.current = isDark;
    setFading(true);
    setTimeout(() => {
      setCur(0);
      setNext(1 % PHOTOS.length);
      setFailed(new Set());
      setFading(false);
    }, FADE_MS);
  }, [isDark]);

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
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[cur % 3]} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, cur]))}
          />
        </div>
      )}

      {/* Следующее фото — предзагрузка */}
      {!failed.has(next) && (
        <div className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}>
          <img
            src={PHOTOS[next].url} alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[next % 3]} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, next]))}
          />
        </div>
      )}

      {/* ── Оверлеи ────────────────────────────────────────────── */}

      {/* Базовое затемнение */}
      <div className="aray-photo-overlay-dark  absolute inset-0 bg-black/55" />
      <div className="aray-photo-overlay-light absolute inset-0 bg-black/[0.08]" />

      {/* Цветной тинт палитры (мгновенно — только CSS) */}
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.20)", mixBlendMode: "color" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.12)", mixBlendMode: "color" }} />

      {/* Виньетка снизу */}
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 38%, transparent 62%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 48%)" }} />

      {/* Виньетка сверху (тёмная тема) */}
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 28%)" }} />

      {/* Лейбл */}
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
