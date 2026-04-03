"use client";

import { useEffect, useState } from "react";

// ── ПРИРОДНЫЕ ФОТО — Unsplash CDN (бесплатно, без ключей, мгновенная загрузка) ──
const PHOTOS = [
  {
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80",
    label: "Горы",
    anim: "kenburns-in",
  },
  {
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80",
    label: "Лес",
    anim: "kenburns-2",
  },
  {
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1920&q=80",
    label: "Океан",
    anim: "kenburns-3",
  },
  {
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
    label: "Альпы",
    anim: "kenburns-in",
  },
  {
    url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1920&q=80",
    label: "Водопад",
    anim: "kenburns-2",
  },
];

const SHOW_MS = 20_000; // 20 сек на каждое фото — дольше, спокойнее
const FADE_MS =  4_000; // 4 сек crossfade — очень плавно

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const [cur,  setCur]  = useState(0);
  const [next, setNext] = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      setFading(true);
      const n = (cur + 1) % PHOTOS.length;
      setNext(n);
      setTimeout(() => { setCur(n); setFading(false); }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, cur]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* Текущее фото */}
      {!failed.has(cur) && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
        >
          <img
            src={PHOTOS[cur].url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation: `${PHOTOS[cur].anim} ${SHOW_MS}ms ease-in-out forwards`,
              willChange: "transform",
            }}
            onError={() => setFailed(f => new Set([...f, cur]))}
          />
        </div>
      )}

      {/* Следующее фото (предзагрузка + появляется при fade) */}
      {!failed.has(next) && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        >
          <img
            src={PHOTOS[next].url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation: `${PHOTOS[next].anim} ${SHOW_MS}ms ease-in-out forwards`,
              willChange: "transform",
            }}
            onError={() => setFailed(f => new Set([...f, next]))}
          />
        </div>
      )}

      {/* ТЁМНАЯ ТЕМА — тёмное затемнение поверх фото */}
      <div className="aray-photo-overlay-dark absolute inset-0 bg-black/48" />
      {/* СВЕТЛАЯ ТЕМА — лёгкое затемнение чтобы витражный цвет читался */}
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(0,0,0,0.12)" }} />
      {/* Виньетка снизу — тёмная тема тёмная, светлая тема светлее */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 40%, transparent 65%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.22) 0%, transparent 50%)" }} />
      {/* Виньетка сверху — только в тёмной теме */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 20%)" }} />

      {/* Лейбл */}
      <div className="absolute bottom-3 right-5 flex items-center gap-1.5 opacity-25">
        <span className="w-1 h-1 rounded-full bg-white" style={{ animation: "pulse 3s ease-in-out infinite" }} />
        <span className="text-white text-[9px] tracking-[0.25em] uppercase font-light">
          {PHOTOS[cur].label}
        </span>
      </div>
    </div>
  );
}
