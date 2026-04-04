"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// ── СВЕТЛАЯ ТЕМА — яркие дневные фото природы ────────────────────────────────
const DAY_PHOTOS = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80", label: "Горы" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80", label: "Лес" },
  { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1920&q=80", label: "Океан" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80", label: "Альпы" },
  { url: "https://images.unsplash.com/photo-1491555103944-7c89fc6e1e65?auto=format&fit=crop&w=1920&q=80", label: "Снежные горы" },
];

// ── ТЁМНАЯ ТЕМА — вечерние и ночные фото ─────────────────────────────────────
const NIGHT_PHOTOS = [
  { url: "https://images.unsplash.com/photo-1419242902344-4b9f4c242d08?auto=format&fit=crop&w=1920&q=80", label: "Млечный путь" },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1920&q=80", label: "Звёздное небо" },
  { url: "https://images.unsplash.com/photo-1480497490-fa5c5aff5051?auto=format&fit=crop&w=1920&q=80", label: "Горный закат" },
  { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80", label: "Ночной пляж" },
  { url: "https://images.unsplash.com/photo-1445905595283-21f8ae8a33d2?auto=format&fit=crop&w=1920&q=80", label: "Ночные горы" },
];

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];

const SHOW_MS = 20_000;
const FADE_MS =  4_000;

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const PHOTOS = isDark ? NIGHT_PHOTOS : DAY_PHOTOS;

  const [cur,    setCur]    = useState(0);
  const [next,   setNext]   = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  // При смене темы — мгновенно переходим на первое фото нового набора
  useEffect(() => {
    setCur(0);
    setNext(1 % PHOTOS.length);
    setFading(false);
    setFailed(new Set());
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

  const curAnim = ANIMS[cur % ANIMS.length];
  const nextAnim = ANIMS[next % ANIMS.length];

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* Текущее фото */}
      {!failed.has(cur) && (
        <div className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}>
          <img
            src={PHOTOS[cur].url} alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${curAnim} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, cur]))}
          />
        </div>
      )}

      {/* Следующее фото (предзагрузка) */}
      {!failed.has(next) && (
        <div className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}>
          <img
            src={PHOTOS[next].url} alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${nextAnim} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, next]))}
          />
        </div>
      )}

      {/* Затемнение — тёмная тема темнее, светлая светлее */}
      <div className="aray-photo-overlay-dark absolute inset-0 bg-black/58" />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(0,0,0,0.10)" }} />

      {/* 🎨 Цветной тинт палитры — мгновенно через CSS переменную */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.18)", mixBlendMode: "color" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.10)", mixBlendMode: "color" }} />

      {/* Виньетка снизу */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.12) 40%, transparent 65%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 50%)" }} />
      {/* Виньетка сверху — тёмная тема */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 25%)" }} />

      {/* Лейбл */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2 opacity-30">
        <span className="text-white text-[9px]">{isDark ? "🌙" : "☀️"}</span>
        <span className="w-px h-3 bg-white/50" />
        <span className="text-white text-[9px] tracking-[0.22em] uppercase font-light">
          {PHOTOS[cur].label}
        </span>
        <span className="w-1 h-1 rounded-full bg-white" style={{ animation: "pulse 3s ease-in-out infinite" }} />
      </div>
    </div>
  );
}
