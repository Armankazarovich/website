"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

// ── Дневные фото — природа, горы, лес, вода ───────────────────────────────────
const DAY: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=75&auto=format&fit=crop", label: "Горные вершины" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1280&q=75&auto=format&fit=crop", label: "Дремучий лес" },
  { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1280&q=75&auto=format&fit=crop", label: "Водопад" },
  { url: "https://images.unsplash.com/photo-1448375240703-89f2b795f098?w=1280&q=75&auto=format&fit=crop", label: "Туманный лес" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1280&q=75&auto=format&fit=crop", label: "Альпы" },
  { url: "https://images.unsplash.com/photo-1439853949212-36652a89e0d3?w=1280&q=75&auto=format&fit=crop", label: "Горное озеро" },
];

// ── Ночные фото — звёзды, северное сияние, ночной лес ────────────────────────
const NIGHT: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1419242902344-4b9f4c242d08?w=1280&q=75&auto=format&fit=crop", label: "Млечный путь" },
  { url: "https://images.unsplash.com/photo-1516912799-8f4ec627d5f4?w=1280&q=75&auto=format&fit=crop", label: "Северное сияние" },
  { url: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=1280&q=75&auto=format&fit=crop", label: "Звёзды над горами" },
  { url: "https://images.unsplash.com/photo-1445905595283-21f8ae8a33d2?w=1280&q=75&auto=format&fit=crop", label: "Ночные горы" },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1280&q=75&auto=format&fit=crop", label: "Звёздное небо" },
  { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=75&auto=format&fit=crop", label: "Галактика" },
];

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];
const SHOW_MS = 14_000; // 14 сек на фото
const FADE_MS =  2_000; // 2 сек переход

function guessIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const s = localStorage.getItem("theme");
    if (s === "light") return false;
    if (s === "dark")  return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return true; }
}

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted]   = useState(false);
  const [cur, setCur]           = useState(0);
  const [next, setNext]         = useState(1);
  const [fading, setFading]     = useState(false);
  const [failed, setFailed]     = useState<Set<number>>(new Set());
  const prevIsDark              = useRef<boolean | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted ? resolvedTheme !== "light" : guessIsDark();
  const PHOTOS = isDark ? NIGHT : DAY;

  // Сброс при смене темы
  useEffect(() => {
    if (!mounted) return;
    if (prevIsDark.current !== null && prevIsDark.current !== isDark) {
      setFading(true);
      setTimeout(() => {
        setCur(0); setNext(1); setFailed(new Set()); setFading(false);
      }, FADE_MS);
    }
    prevIsDark.current = isDark;
  }, [isDark, mounted]);

  // Автосмена фото
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      const n = (cur + 1) % PHOTOS.length;
      setNext(n);
      setFading(true);
      setTimeout(() => { setCur(n); setFading(false); }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, cur, PHOTOS.length]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* ── Слой 1: CSS градиент-блобы (всегда видны, мгновенно) ── */}
      <div className="absolute inset-0 transition-colors duration-1000"
        style={{ background: isDark ? "#040b14" : "#e8f2ee" }} />
      <div className="absolute inset-0" style={{ filter: "blur(90px)", opacity: 0.85 }}>
        {isDark ? (
          <>
            <div className="absolute rounded-full" style={{ width:"65%", height:"65%", top:"5%", left:"-5%", background:"radial-gradient(circle, #0d3d28 0%, transparent 72%)", animation:"aray-blob-1 20s ease-in-out infinite" }} />
            <div className="absolute rounded-full" style={{ width:"58%", height:"58%", top:"45%", left:"48%", background:"radial-gradient(circle, #0a1e3d 0%, transparent 72%)", animation:"aray-blob-2 24s ease-in-out infinite" }} />
            <div className="absolute rounded-full" style={{ width:"52%", height:"52%", top:"25%", left:"35%", background:"radial-gradient(circle, #14093a 0%, transparent 72%)", animation:"aray-blob-3 18s ease-in-out infinite" }} />
            <div className="absolute rounded-full" style={{ width:"44%", height:"44%", top:"60%", left:"5%",  background:"radial-gradient(circle, #082a18 0%, transparent 72%)", animation:"aray-blob-4 22s ease-in-out infinite" }} />
          </>
        ) : (
          <>
            <div className="absolute rounded-full" style={{ width:"70%", height:"70%", top:"-5%", left:"-8%", background:"radial-gradient(circle, #8ecfb5 0%, transparent 72%)", animation:"aray-blob-1 20s ease-in-out infinite" }} />
            <div className="absolute rounded-full" style={{ width:"60%", height:"60%", top:"40%", left:"45%", background:"radial-gradient(circle, #92c4e0 0%, transparent 72%)", animation:"aray-blob-2 24s ease-in-out infinite" }} />
            <div className="absolute rounded-full" style={{ width:"55%", height:"55%", top:"20%", left:"30%", background:"radial-gradient(circle, #a8d4b0 0%, transparent 72%)", animation:"aray-blob-3 18s ease-in-out infinite" }} />
            <div className="absolute rounded-full" style={{ width:"48%", height:"48%", top:"58%", left:"2%",  background:"radial-gradient(circle, #b8ddd0 0%, transparent 72%)", animation:"aray-blob-4 22s ease-in-out infinite" }} />
          </>
        )}
      </div>

      {/* ── Слой 2: Реальные фото поверх градиента (когда загрузятся) ── */}
      {!failed.has(cur) && (
        <div className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}>
          <img src={PHOTOS[cur].url} alt="" fetchPriority="high" decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[cur % 3]} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, cur]))} />
        </div>
      )}
      {!failed.has(next) && (
        <div className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}>
          <img src={PHOTOS[next].url} alt="" decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[next % 3]} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, next]))} />
        </div>
      )}
      {/* Предзагрузка следующего */}
      {(() => {
        const p = (cur + 2) % PHOTOS.length;
        return !failed.has(p) ? <img key={p} src={PHOTOS[p].url} alt="" decoding="async" fetchPriority="low" className="absolute opacity-0 w-0 h-0 pointer-events-none" /> : null;
      })()}

      {/* ── Оверлеи ── */}
      <div className="aray-photo-overlay-dark  absolute inset-0" style={{ background: "rgba(4,8,18,0.48)" }} />
      <div className="aray-photo-overlay-dark  absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,8,18,0.78) 0%, rgba(4,8,18,0.10) 42%, transparent 65%)" }} />
      <div className="aray-photo-overlay-dark  absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(4,8,18,0.42) 0%, transparent 30%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(255,255,255,0.10)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.22) 0%, transparent 50%)" }} />

      {/* ── Лейбл ── */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.24 }}>
        <span className="text-white text-[9px]">{isDark ? "🌙" : "☀️"}</span>
        <span className="w-px h-3 bg-white/50" />
        <span className="text-white text-[9px] tracking-[0.22em] uppercase font-light">
          {failed.has(cur) ? (isDark ? "ARAY · Ночь" : "ARAY · День") : PHOTOS[cur]?.label}
        </span>
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
      </div>

    </div>
  );
}
