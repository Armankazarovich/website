"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

// ── 12 дневных фото: только природа ──────────────────────────────────────────
const DAY: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop", label: "Горные вершины" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85&auto=format&fit=crop", label: "Дремучий лес" },
  { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=85&auto=format&fit=crop", label: "Водопад" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85&auto=format&fit=crop", label: "Альпы" },
  { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=85&auto=format&fit=crop", label: "Океан" },
  { url: "https://images.unsplash.com/photo-1448375240703-89f2b795f098?w=1920&q=85&auto=format&fit=crop", label: "Туманный лес" },
  { url: "https://images.unsplash.com/photo-1491555103944-7c89fc6e1e65?w=1920&q=85&auto=format&fit=crop", label: "Снежные горы" },
  { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85&auto=format&fit=crop", label: "Закат над горами" },
  { url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=85&auto=format&fit=crop", label: "Зелёные холмы" },
  { url: "https://images.unsplash.com/photo-1439853949212-36652a89e0d3?w=1920&q=85&auto=format&fit=crop", label: "Горное озеро" },
  { url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1920&q=85&auto=format&fit=crop", label: "Осенний лес" },
  { url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1920&q=85&auto=format&fit=crop", label: "Горная долина" },
];

// ── 12 ночных фото: только природа ───────────────────────────────────────────
const NIGHT: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1419242902344-4b9f4c242d08?w=1920&q=85&auto=format&fit=crop", label: "Млечный путь" },
  { url: "https://images.unsplash.com/photo-1480497490-fa5c5aff5051?w=1920&q=85&auto=format&fit=crop", label: "Горный закат" },
  { url: "https://images.unsplash.com/photo-1516912799-8f4ec627d5f4?w=1920&q=85&auto=format&fit=crop", label: "Северное сияние" },
  { url: "https://images.unsplash.com/photo-1445905595283-21f8ae8a33d2?w=1920&q=85&auto=format&fit=crop", label: "Ночные горы" },
  { url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1920&q=85&auto=format&fit=crop", label: "Горное озеро" },
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop&bri=-30", label: "Ночные вершины" },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=85&auto=format&fit=crop", label: "Звёздное небо" },
  { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=85&auto=format&fit=crop", label: "Ночной лес" },
  { url: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=1920&q=85&auto=format&fit=crop", label: "Звёзды над горами" },
  { url: "https://images.unsplash.com/photo-1472214103597-f85f9a3f1ab6?w=1920&q=85&auto=format&fit=crop", label: "Ночная тайга" },
  { url: "https://images.unsplash.com/photo-1504701954957-a574bfe0b0f9?w=1920&q=85&auto=format&fit=crop", label: "Полярное сияние" },
  { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=85&auto=format&fit=crop", label: "Галактика" },
];

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];
const SHOW_MS = 22_000;
const FADE_MS =  4_000;

function guessIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light") return false;
    if (stored === "dark")  return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return true; }
}

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const isDark = mounted ? resolvedTheme !== "light" : guessIsDark();
  const PHOTOS = isDark ? NIGHT : DAY;

  const [cur,    setCur]    = useState(0);
  const [next,   setNext]   = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const prevIsDark = useRef(isDark);

  useEffect(() => { setMounted(true); }, []);

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
      <div className="aray-photo-overlay-dark  absolute inset-0 bg-black/55" />
      <div className="aray-photo-overlay-light absolute inset-0 bg-black/[0.08]" />

      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.35)", mixBlendMode: "color" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.28)", mixBlendMode: "color" }} />
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.12)", mixBlendMode: "soft-light" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "hsl(var(--primary)/0.10)", mixBlendMode: "soft-light" }} />

      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 38%, transparent 62%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 48%)" }} />
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 28%)" }} />

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
