"use client";

import { useEffect, useState } from "react";

// ── 8 тщательно отобранных фото: только прохладные тона (лес, горы, вода, космос) ──
// Никаких закатов, пустынь и тёплых оранжевых тонов — только холодная природа
const PHOTOS: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1448375240703-89f2b795f098?w=1920&q=85&auto=format&fit=crop", label: "Туманный лес" },
  { url: "https://images.unsplash.com/photo-1516912799-8f4ec627d5f4?w=1920&q=85&auto=format&fit=crop", label: "Северное сияние" },
  { url: "https://images.unsplash.com/photo-1419242902344-4b9f4c242d08?w=1920&q=85&auto=format&fit=crop", label: "Млечный путь" },
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop", label: "Горные вершины" },
  { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=85&auto=format&fit=crop", label: "Водопад" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85&auto=format&fit=crop", label: "Дремучий лес" },
  { url: "https://images.unsplash.com/photo-1439853949212-36652a89e0d3?w=1920&q=85&auto=format&fit=crop", label: "Горное озеро" },
  { url: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=1920&q=85&auto=format&fit=crop", label: "Звёзды над горами" },
];

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];
const SHOW_MS = 22_000; // 22 сек на фото
const FADE_MS =  4_000; // 4 сек плавный переход

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const [cur,    setCur]    = useState(0);
  const [next,   setNext]   = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  // Автоматическая смена фото
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      const n = (cur + 1) % PHOTOS.length;
      setNext(n);
      setFading(true);
      setTimeout(() => { setCur(n); setFading(false); }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, cur]);

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

      {/* Следующее фото — предзагружается в фоне */}
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

      {/* Скрытая предзагрузка следующего фото */}
      {(() => {
        const preload = (cur + 2) % PHOTOS.length;
        return !failed.has(preload) ? (
          <img key={preload} src={PHOTOS[preload].url} alt=""
            decoding="async" fetchPriority="low"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
          />
        ) : null;
      })()}

      {/* ── Оверлеи ── */}
      {/* Базовое затемнение — лёгкое, чтобы фото было видно */}
      <div className="absolute inset-0" style={{ background: "rgba(4, 6, 18, 0.30)" }} />

      {/* Виньетка снизу — более мягкая */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(4,6,18,0.70) 0%, rgba(4,6,18,0.10) 40%, transparent 62%)" }} />

      {/* Виньетка сверху — лёгкая */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(4,6,18,0.38) 0%, transparent 28%)" }} />

      {/* Лейбл фото */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.22 }}>
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
        <span className="text-white text-[9px] tracking-[0.22em] uppercase font-light">
          {PHOTOS[cur]?.label}
        </span>
      </div>

    </div>
  );
}
