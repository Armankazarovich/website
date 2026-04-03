"use client";

import { useState, useEffect, useRef } from "react";

// ── БЕСПЛАТНЫЕ ПРИРОДНЫЕ ВИДЕО — Mixkit CDN (без ключей, free forever) ───────
const NATURE_VIDEOS = [
  { url: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164/large.mp4",      label: "Океан" },
  { url: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529/large.mp4", label: "Лес" },
  { url: "https://assets.mixkit.co/videos/preview/mixkit-rocky-mountains-with-snowy-peaks-7738/large.mp4", label: "Горы" },
  { url: "https://assets.mixkit.co/videos/preview/mixkit-small-waterfall-in-the-forest-4145/large.mp4", label: "Водопад" },
  { url: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-road-in-the-mountains-45537/large.mp4", label: "Горная дорога" },
];

// Резервные CSS-сцены если видео не грузится
const FALLBACK_SCENES = [
  `radial-gradient(ellipse 120% 80% at 20% 80%, #0c2a4a 0%, #1a4a6e 35%, #0d3355 70%, #051a2e 100%)`,
  `radial-gradient(ellipse 120% 100% at 50% 100%, #0a1f0a 0%, #0d3b1a 30%, #1a5c2a 60%, #0f2d14 100%)`,
  `radial-gradient(ellipse 100% 60% at 50% 40%, #4a1942 0%, #6b2d5e 25%, #2d0d2b 60%, #1a0818 100%)`,
  `radial-gradient(ellipse 100% 80% at 30% 70%, #0a2030 0%, #0d3548 30%, #1a5570 60%, #0a1f30 100%)`,
  `radial-gradient(ellipse 110% 70% at 60% 60%, #1a0d00 0%, #3d1f00 30%, #5c3300 60%, #2a1500 100%)`,
];

const SWITCH_INTERVAL = 28000; // 28 секунд
const FADE_DURATION   = 2500;  // 2.5 секунды crossfade

interface Props { enabled: boolean }

export function AdminNatureBg({ enabled }: Props) {
  const [current, setCurrent]   = useState(0);
  const [next, setNext]         = useState(1);
  const [fading, setFading]     = useState(false);
  const [videoFailed, setVideoFailed] = useState<boolean[]>(NATURE_VIDEOS.map(() => false));
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const total = NATURE_VIDEOS.length;

  // Автосмена каждые SWITCH_INTERVAL мс
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const n = (current + 1) % total;
      setNext(n);
      setFading(true);
      setTimeout(() => {
        setCurrent(n);
        setFading(false);
      }, FADE_DURATION);
    }, SWITCH_INTERVAL);
    return () => clearInterval(timer);
  }, [enabled, current, total]);

  if (!enabled) return null;

  const allFailed = videoFailed.every(Boolean);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* ── ВИДЕО или CSS-фон ── */}
      {NATURE_VIDEOS.map((v, i) => {
        const isCurrent = i === current;
        const isNext    = i === next && fading;
        const visible   = isCurrent || isNext;
        const opacity   = isNext ? 1 : isCurrent && fading ? 0 : isCurrent ? 1 : 0;

        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{ opacity, transition: `opacity ${FADE_DURATION}ms ease-in-out`, zIndex: isNext ? 2 : 1 }}
          >
            {!videoFailed[i] ? (
              <video
                ref={el => { videoRefs.current[i] = el; }}
                autoPlay muted loop playsInline preload={i <= 1 ? "auto" : "none"}
                onError={() => setVideoFailed(f => { const n=[...f]; n[i]=true; return n; })}
                className="absolute inset-0 w-full h-full object-cover"
                src={v.url}
              />
            ) : (
              // Резервный CSS-фон если видео не загрузилось
              <div className="absolute inset-0" style={{ background: FALLBACK_SCENES[i] }} />
            )}
          </div>
        );
      })}

      {/* ── МНОГОСЛОЙНОЕ ЗАТЕМНЕНИЕ ── */}
      {/* Слой 1: основное затемнение */}
      <div className="absolute inset-0 z-10 bg-black/40" />
      {/* Слой 2: снизу тяжелее — текст на нижних блоках лучше читается */}
      <div className="absolute inset-0 z-10"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.05) 100%)" }}
      />
      {/* Слой 3: сверху лёгкий для шапки */}
      <div className="absolute inset-0 z-10"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 20%)" }}
      />

      {/* ── ЛЕЙБЛ СЦЕНЫ ── */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5"
        style={{ opacity: 0.3 }}>
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
        <span className="text-white text-[9px] font-semibold tracking-[0.2em] uppercase">
          {NATURE_VIDEOS[current]?.label}
        </span>
      </div>
    </div>
  );
}
