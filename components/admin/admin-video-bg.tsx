"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

// ── Видео-фоны: Mixkit CDN (CC0, работает из России) ──────────────────────
// ✅ Mixkit — бесплатные CC0 видео, CDN доступен без VPN
// ✅ 720p — отличное качество, лёгкие файлы (2-7 МБ)
// ✅ Если видео не грузится за LOAD_TIMEOUT_MS — fallback на CSS-градиент
// ✅ На мобильном (< 1024px) — только CSS-градиент

interface VideoItem {
  mp4: string;
  label: string;
}

// День: природа, горы, вода, облака — 720p
const DAY_VIDEOS: VideoItem[] = [
  { mp4: "https://assets.mixkit.co/videos/1166/1166-720.mp4",  label: "Утренний лес" },
  { mp4: "https://assets.mixkit.co/videos/4141/4141-720.mp4",  label: "Закат на море" },
  { mp4: "https://assets.mixkit.co/videos/28294/28294-720.mp4", label: "Горная река" },
  { mp4: "https://assets.mixkit.co/videos/3784/3784-720.mp4",  label: "Водопад" },
  { mp4: "https://assets.mixkit.co/videos/9668/9668-720.mp4",  label: "Зелёные холмы" },
  { mp4: "https://assets.mixkit.co/videos/4817/4817-720.mp4",  label: "Облака в горах" },
  { mp4: "https://assets.mixkit.co/videos/1226/1226-720.mp4",  label: "Туман в лесу" },
  { mp4: "https://assets.mixkit.co/videos/34563/34563-720.mp4", label: "Цветущий луг" },
];

// Ночь: звёзды, сияние, космос — 720p
const NIGHT_VIDEOS: VideoItem[] = [
  { mp4: "https://assets.mixkit.co/videos/4883/4883-720.mp4",  label: "Звёздное небо" },
  { mp4: "https://assets.mixkit.co/videos/3181/3181-720.mp4",  label: "Млечный путь" },
  { mp4: "https://assets.mixkit.co/videos/4690/4690-720.mp4",  label: "Северное сияние" },
  { mp4: "https://assets.mixkit.co/videos/9471/9471-720.mp4",  label: "Ночной лес" },
  { mp4: "https://assets.mixkit.co/videos/1409/1409-720.mp4",  label: "Луна" },
];

const FADE_MS = 2500;
const LOAD_TIMEOUT_MS = 12000;

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

/**
 * AdminVideoBg — видеофон с плавным кроссфейдом.
 *
 * Использует 2 постоянных video-элемента (A и B) которые чередуются:
 * - Когда A заканчивается → загружаем следующее в B → кроссфейд A→B
 * - Когда B заканчивается → загружаем следующее в A → кроссфейд B→A
 *
 * Это избегает пересоздания DOM-элементов и потери загруженного видео.
 */
export function AdminVideoBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [fallbackToGradient, setFallbackToGradient] = useState(false);

  // A/B видео элементы — чередуются
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  // Какой элемент сейчас активен: "A" или "B"
  const activeSlotRef = useRef<"A" | "B">("A");
  const [activeSlot, setActiveSlot] = useState<"A" | "B">("A");

  // Текущий индекс видео в плейлисте
  const currentIdxRef = useRef(0);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Opacities для кроссфейда
  const [opacityA, setOpacityA] = useState(1);
  const [opacityB, setOpacityB] = useState(0);

  // Первое видео загрузилось?
  const [firstReady, setFirstReady] = useState(false);

  // Таймеры
  const loadTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevIsDark = useRef<boolean | null>(null);
  const errorCountRef = useRef(0);
  const MAX_ERRORS = 3; // После 3 ошибок подряд — fallback на градиент

  useEffect(() => { setMounted(true); }, []);

  // Page Visibility API
  useEffect(() => {
    const onChange = () => {
      setTabHidden(document.hidden);
      if (document.hidden) {
        videoARef.current?.pause();
        videoBRef.current?.pause();
      } else {
        const active = activeSlotRef.current === "A" ? videoARef.current : videoBRef.current;
        active?.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  // Resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isDark = mounted ? resolvedTheme !== "light" : guessIsDark();
  const VIDEOS = isDark ? NIGHT_VIDEOS : DAY_VIDEOS;
  const videosRef = useRef(VIDEOS);
  videosRef.current = VIDEOS;

  // Сброс при смене темы
  useEffect(() => {
    if (!mounted) return;
    if (prevIsDark.current !== null && prevIsDark.current !== isDark) {
      // Сбрасываем всё
      currentIdxRef.current = 0;
      setCurrentIdx(0);
      activeSlotRef.current = "A";
      setActiveSlot("A");
      setOpacityA(1);
      setOpacityB(0);
      setFirstReady(false);
      setFallbackToGradient(false);

      // Загружаем первое видео новой темы в слот A
      const vA = videoARef.current;
      if (vA) {
        const newVideos = isDark ? NIGHT_VIDEOS : DAY_VIDEOS;
        vA.src = newVideos[0].mp4;
        vA.load();
        vA.play().catch(() => {});
      }
    }
    prevIsDark.current = isDark;
  }, [isDark, mounted]);

  // Инициализация — загружаем первое видео в слот A
  useEffect(() => {
    if (isMobile || !enabled || !mounted) return;
    const vA = videoARef.current;
    if (!vA) return;

    vA.src = VIDEOS[0].mp4;
    vA.load();
    vA.play().catch(() => {});

    // Таймаут загрузки
    loadTimerRef.current = setTimeout(() => {
      if (!firstReady) setFallbackToGradient(true);
    }, LOAD_TIMEOUT_MS);

    return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isMobile, enabled]);

  // Первое видео готово
  const handleFirstCanPlay = useCallback(() => {
    setFirstReady(true);
    setFallbackToGradient(false);
    errorCountRef.current = 0; // Сброс ошибок — видео работает
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
  }, []);

  // Видео закончилось — запускаем кроссфейд к следующему
  const handleVideoEnded = useCallback(() => {
    const videos = videosRef.current;
    const nextIdx = (currentIdxRef.current + 1) % videos.length;
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);

    const currentSlot = activeSlotRef.current;
    const nextSlot = currentSlot === "A" ? "B" : "A";
    const nextVideoEl = nextSlot === "A" ? videoARef.current : videoBRef.current;

    if (!nextVideoEl) return;

    // Загружаем следующее видео в неактивный слот
    nextVideoEl.src = videos[nextIdx].mp4;
    nextVideoEl.load();

    const startCrossfade = () => {
      nextVideoEl.play().catch(() => {});

      // Кроссфейд: плавно показываем новый, скрываем старый
      if (nextSlot === "A") {
        setOpacityA(1);
        setOpacityB(0);
      } else {
        setOpacityA(0);
        setOpacityB(1);
      }

      activeSlotRef.current = nextSlot;
      setActiveSlot(nextSlot);

      // После завершения анимации — останавливаем старое видео
      fadeTimerRef.current = setTimeout(() => {
        const oldVideoEl = currentSlot === "A" ? videoARef.current : videoBRef.current;
        if (oldVideoEl) {
          oldVideoEl.pause();
          oldVideoEl.removeAttribute("src");
          oldVideoEl.load(); // Освобождаем память
        }
      }, FADE_MS + 200);
    };

    // Когда следующее видео готово — начинаем кроссфейд
    const onReady = () => {
      nextVideoEl.removeEventListener("canplay", onReady);
      startCrossfade();
    };

    // Если уже готово (закешировано)
    if (nextVideoEl.readyState >= 3) {
      startCrossfade();
    } else {
      nextVideoEl.addEventListener("canplay", onReady);
      // Таймаут — если не загрузилось, пропускаем
      setTimeout(() => {
        nextVideoEl.removeEventListener("canplay", onReady);
        // Попробуем следующее видео
        const skipIdx = (nextIdx + 1) % videos.length;
        currentIdxRef.current = skipIdx;
        setCurrentIdx(skipIdx);
        // Пробуем следующее
        nextVideoEl.src = videos[skipIdx].mp4;
        nextVideoEl.load();
        nextVideoEl.addEventListener("canplay", () => {
          nextVideoEl.removeEventListener("canplay", onReady);
          startCrossfade();
        }, { once: true });
      }, LOAD_TIMEOUT_MS);
    }
  }, []);

  // Ошибка загрузки — пропускаем видео, после MAX_ERRORS → fallback
  const handleError = useCallback((slot: "A" | "B") => {
    errorCountRef.current += 1;
    if (errorCountRef.current >= MAX_ERRORS) {
      // Все видео недоступны (Pexels 403 и т.п.) — переходим на градиент
      setFallbackToGradient(true);
      const vA = videoARef.current;
      const vB = videoBRef.current;
      if (vA) { vA.pause(); vA.removeAttribute("src"); }
      if (vB) { vB.pause(); vB.removeAttribute("src"); }
      return;
    }

    const videos = videosRef.current;
    const nextIdx = (currentIdxRef.current + 1) % videos.length;
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);

    const videoEl = slot === "A" ? videoARef.current : videoBRef.current;
    if (videoEl) {
      videoEl.src = videos[nextIdx].mp4;
      videoEl.load();
      videoEl.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  if (!enabled || !mounted) return null;

  const showVideo = !isMobile && !fallbackToGradient;
  const curLabel = VIDEOS[currentIdx]?.label || (isDark ? "ARAY · Ночь" : "ARAY · День");

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* ── Слой 0: Базовый цвет ── */}
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{ background: isDark ? "#040b14" : "#daedf5" }}
      />

      {/* ── Слой 1: CSS градиент-блобы (фоллбэк + подложка) ── */}
      <div className="absolute inset-0" style={{
        filter: isMobile ? "none" : "blur(100px)",
        opacity: firstReady && !fallbackToGradient ? 0.3 : 0.85,
        transition: "opacity 3s ease",
      }}>
        {isDark ? (
          <>
            <div className="absolute rounded-full" style={{ width: "65%", height: "65%", top: "5%", left: "-5%", background: "radial-gradient(circle, #0d3d28 0%, transparent 70%)", animation: fallbackToGradient ? "aray-blob-1 20s ease-in-out infinite" : "none", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "58%", height: "58%", top: "45%", left: "48%", background: "radial-gradient(circle, #0a1e3d 0%, transparent 70%)", animation: fallbackToGradient ? "aray-blob-2 24s ease-in-out infinite" : "none", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "52%", height: "52%", top: "25%", left: "35%", background: "radial-gradient(circle, #14093a 0%, transparent 70%)", animation: fallbackToGradient ? "aray-blob-3 18s ease-in-out infinite" : "none", animationPlayState: tabHidden ? "paused" : "running" }} />
          </>
        ) : (
          <>
            <div className="absolute rounded-full" style={{ width: "70%", height: "70%", top: "-5%", left: "-8%", background: "radial-gradient(circle, #60c5a8 0%, transparent 70%)", animation: fallbackToGradient ? "aray-blob-1 20s ease-in-out infinite" : "none", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "60%", height: "60%", top: "40%", left: "45%", background: "radial-gradient(circle, #6ab8e0 0%, transparent 70%)", animation: fallbackToGradient ? "aray-blob-2 24s ease-in-out infinite" : "none", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width: "55%", height: "55%", top: "20%", left: "30%", background: "radial-gradient(circle, #78c895 0%, transparent 70%)", animation: fallbackToGradient ? "aray-blob-3 18s ease-in-out infinite" : "none", animationPlayState: tabHidden ? "paused" : "running" }} />
          </>
        )}
      </div>

      {/* ── Слой 2: Видео A ── */}
      {showVideo && (
        <video
          ref={videoARef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: firstReady ? opacityA : 0,
            transition: `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
          muted
          playsInline
          preload="auto"
          onCanPlay={activeSlot === "A" && !firstReady ? handleFirstCanPlay : undefined}
          onEnded={activeSlot === "A" ? handleVideoEnded : undefined}
          onError={() => handleError("A")}
        />
      )}

      {/* ── Слой 3: Видео B ── */}
      {showVideo && (
        <video
          ref={videoBRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: firstReady ? opacityB : 0,
            transition: `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
          muted
          playsInline
          preload="auto"
          onEnded={activeSlot === "B" ? handleVideoEnded : undefined}
          onError={() => handleError("B")}
        />
      )}

      {/* ── Оверлеи — видео как тонкий фон, не отвлекает ── */}
      <div className="aray-photo-overlay-dark absolute inset-0" style={{ background: "rgba(10,10,12,0.68)" }} />
      <div className="aray-photo-overlay-dark absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,12,0.88) 0%, rgba(10,10,12,0.20) 50%, transparent 70%)" }} />
      <div className="aray-photo-overlay-dark absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,10,12,0.55) 0%, transparent 35%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(10,10,12,0.52)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,12,0.72) 0%, transparent 55%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,10,12,0.48) 0%, transparent 30%)" }} />

      {/* ── Лейбл ── */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.22 }}>
        <span className="text-white text-[9px]">{isDark ? "🌙" : "☀️"}</span>
        <span className="w-px h-3 bg-white/50" />
        <span className="text-white text-[9px] tracking-[0.22em] uppercase font-light">
          {firstReady ? "🎬" : "⏳"} {curLabel}
        </span>
        {firstReady && <span className="w-1 h-1 rounded-full bg-white animate-pulse" />}
      </div>
    </div>
  );
}
