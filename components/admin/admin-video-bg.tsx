"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

// ── Видео-фоны: Pexels CDN ─────────────────────────────────────────────────
// ✅ Pexels CDN работает из России без VPN
// ✅ HD 1080p — компромисс: хорошее качество, малый размер (~5-15 МБ)
// ✅ Если видео не грузится за LOAD_TIMEOUT_MS — автоматически fallback на CSS-градиент
// ✅ На мобильном (< 1024px) — только CSS-градиент (экономим трафик и батарею)

interface VideoItem {
  mp4: string;
  label: string;
}

// День: природа, горы, вода, облака — HD 1080p для экономии трафика
const DAY_VIDEOS: VideoItem[] = [
  { mp4: "https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4", label: "Лесная река" },
  { mp4: "https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4", label: "Океан на закате" },
  { mp4: "https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4", label: "Утренний туман" },
  { mp4: "https://videos.pexels.com/video-files/2098989/2098989-hd_1920_1080_30fps.mp4", label: "Цветущее поле" },
  { mp4: "https://videos.pexels.com/video-files/1918465/1918465-hd_1920_1080_24fps.mp4", label: "Водопад" },
  { mp4: "https://videos.pexels.com/video-files/3571264/3571264-hd_1280_720_30fps.mp4", label: "Облака над горами" },
];

// Ночь: звёзды, сияние — HD 1080p
const NIGHT_VIDEOS: VideoItem[] = [
  { mp4: "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4", label: "Ночное небо" },
  { mp4: "https://videos.pexels.com/video-files/1466209/1466209-hd_1920_1080_24fps.mp4", label: "Северное сияние" },
  { mp4: "https://videos.pexels.com/video-files/1851190/1851190-hd_1920_1080_24fps.mp4", label: "Млечный путь" },
  { mp4: "https://videos.pexels.com/video-files/3194277/3194277-hd_1920_1080_30fps.mp4", label: "Звёздная ночь" },
  { mp4: "https://videos.pexels.com/video-files/856236/856236-hd_1920_1080_25fps.mp4", label: "Горный рассвет" },
];

const FADE_MS = 2000;
const LOAD_TIMEOUT_MS = 12_000; // 12 сек на загрузку — если не успело, показываем градиент

function guessIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const s = localStorage.getItem("theme");
    if (s === "light") return false;
    if (s === "dark") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
}

export function AdminVideoBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [cur, setCur] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [videoReady, setVideoReady] = useState(false); // Видео загрузилось и играет
  const [loadFailed, setLoadFailed] = useState<Record<number, boolean>>({});
  const curVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevIsDark = useRef<boolean | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Page Visibility API — пауза когда вкладка скрыта
  useEffect(() => {
    const onChange = () => {
      setTabHidden(document.hidden);
      if (document.hidden) {
        curVideoRef.current?.pause();
        nextVideoRef.current?.pause();
      } else {
        curVideoRef.current?.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isDark = mounted ? resolvedTheme !== "light" : guessIsDark();
  const VIDEOS = isDark ? NIGHT_VIDEOS : DAY_VIDEOS;

  // Сброс при смене темы
  useEffect(() => {
    if (!mounted) return;
    if (prevIsDark.current !== null && prevIsDark.current !== isDark) {
      setCur(0);
      setNext(null);
      setFading(false);
      setVideoReady(false);
      setLoadFailed({});
    }
    prevIsDark.current = isDark;
  }, [isDark, mounted]);

  // Таймаут загрузки — если видео не начало играть за LOAD_TIMEOUT_MS, не показываем
  useEffect(() => {
    if (isMobile || !enabled) return;
    setVideoReady(false);
    loadTimerRef.current = setTimeout(() => {
      // Если за 12 сек не загрузилось — помечаем как failed
      if (!videoReady) {
        setLoadFailed(prev => ({ ...prev, [cur]: true }));
      }
    }, LOAD_TIMEOUT_MS);
    return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, isMobile, enabled]);

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
  }, []);

  // Переключение видео по окончании текущего
  const handleEnded = useCallback(() => {
    let nextIdx = (cur + 1) % VIDEOS.length;
    // Пропускаем видео с ошибкой загрузки
    for (let i = 0; i < VIDEOS.length; i++) {
      if (!loadFailed[nextIdx]) break;
      nextIdx = (nextIdx + 1) % VIDEOS.length;
    }
    setNext(nextIdx);
    setFading(true);

    setTimeout(() => {
      setCur(nextIdx);
      setNext(null);
      setFading(false);
      setVideoReady(false);
    }, FADE_MS);
  }, [cur, VIDEOS.length, loadFailed]);

  const handleError = useCallback((idx: number) => {
    setLoadFailed(prev => ({ ...prev, [idx]: true }));
    if (idx === cur) {
      const nextIdx = (cur + 1) % VIDEOS.length;
      setCur(nextIdx);
      setVideoReady(false);
    }
  }, [cur, VIDEOS.length]);

  if (!enabled || !mounted) return null;

  const curVideo = VIDEOS[cur];
  const nextVideo = next !== null ? VIDEOS[next] : null;
  const showVideo = !isMobile && !loadFailed[cur];

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* ── Слой 0: Базовый цвет (мгновенно, 0 байт) ── */}
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{ background: isDark ? "#040b14" : "#daedf5" }}
      />

      {/* ── Слой 1: CSS градиент-блобы (всегда видны, фоллбэк для медленного интернета) ── */}
      <div className="absolute inset-0" style={{ filter: isMobile ? "none" : "blur(100px)", opacity: videoReady ? 0.3 : 0.85, transition: "opacity 3s ease" }}>
        {isDark ? (
          <>
            <div className="absolute rounded-full" style={{ width: "65%", height: "65%", top: "5%", left: "-5%", background: "radial-gradient(circle, #0d3d28 0%, transparent 70%)", animation: "aray-blob-1 20s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "58%", height: "58%", top: "45%", left: "48%", background: "radial-gradient(circle, #0a1e3d 0%, transparent 70%)", animation: "aray-blob-2 24s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "52%", height: "52%", top: "25%", left: "35%", background: "radial-gradient(circle, #14093a 0%, transparent 70%)", animation: "aray-blob-3 18s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
          </>
        ) : (
          <>
            <div className="absolute rounded-full" style={{ width: "70%", height: "70%", top: "-5%", left: "-8%", background: "radial-gradient(circle, #60c5a8 0%, transparent 70%)", animation: "aray-blob-1 20s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "60%", height: "60%", top: "40%", left: "45%", background: "radial-gradient(circle, #6ab8e0 0%, transparent 70%)", animation: "aray-blob-2 24s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "55%", height: "55%", top: "20%", left: "30%", background: "radial-gradient(circle, #78c895 0%, transparent 70%)", animation: "aray-blob-3 18s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
          </>
        )}
      </div>

      {/* ── Слой 2: Текущее видео (desktop, с плавным появлением когда загрузилось) ── */}
      {showVideo && curVideo && (
        <video
          ref={curVideoRef}
          key={`video-cur-${cur}-${isDark}`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: videoReady && !fading ? 1 : 0,
            transition: `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
          src={curVideo.mp4}
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={handleCanPlay}
          onEnded={handleEnded}
          onError={() => handleError(cur)}
        />
      )}

      {/* ── Слой 3: Следующее видео (fade-in при переключении) ── */}
      {showVideo && nextVideo && next !== null && !loadFailed[next] && (
        <video
          ref={nextVideoRef}
          key={`video-next-${next}-${isDark}`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: fading ? 1 : 0,
            transition: `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
          src={nextVideo.mp4}
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={() => handleError(next)}
        />
      )}

      {/* ── Оверлеи для читабельности текста ── */}
      <div className="aray-photo-overlay-dark absolute inset-0" style={{ background: "rgba(10,10,12,0.50)" }} />
      <div className="aray-photo-overlay-dark absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,12,0.78) 0%, rgba(10,10,12,0.10) 42%, transparent 65%)" }} />
      <div className="aray-photo-overlay-dark absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,10,12,0.40) 0%, transparent 30%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(10,10,12,0.32)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,12,0.58) 0%, transparent 52%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,10,12,0.34) 0%, transparent 28%)" }} />

      {/* ── Лейбл ── */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.22 }}>
        <span className="text-white text-[9px]">{isDark ? "🌙" : "☀️"}</span>
        <span className="w-px h-3 bg-white/50" />
        <span className="text-white text-[9px] tracking-[0.22em] uppercase font-light">
          {videoReady ? "🎬" : "⏳"} {curVideo?.label || (isDark ? "ARAY · Ночь" : "ARAY · День")}
        </span>
        {videoReady && <span className="w-1 h-1 rounded-full bg-white animate-pulse" />}
      </div>
    </div>
  );
}
