"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

// ── Два CDN — Pexels первый (надёжен в России), Unsplash запасной ─────────────
// Если Pexels не грузит → автоматически переключается на Unsplash через onError
// CSS градиент всегда видно мгновенно — никакой пустоты

const DAY: { url: string; backup: string; label: string }[] = [
  {
    url:    "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=75&auto=format&fit=crop",
    label:  "Горные вершины",
  },
  {
    url:    "https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1280&q=75&auto=format&fit=crop",
    label:  "Дремучий лес",
  },
  {
    url:    "https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1280&q=75&auto=format&fit=crop",
    label:  "Водопад",
  },
  {
    url:    "https://images.pexels.com/photos/1459495/pexels-photo-1459495.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1448375240703-89f2b795f098?w=1280&q=75&auto=format&fit=crop",
    label:  "Лесной рассвет",
  },
  {
    url:    "https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1280&q=75&auto=format&fit=crop",
    label:  "Горное озеро",
  },
  {
    url:    "https://images.pexels.com/photos/933054/pexels-photo-933054.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1439853949212-36652a89e0d3?w=1280&q=75&auto=format&fit=crop",
    label:  "Горный туман",
  },
];

const NIGHT: { url: string; backup: string; label: string }[] = [
  {
    url:    "https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1419242902344-4b9f4c242d08?w=1280&q=75&auto=format&fit=crop",
    label:  "Млечный путь",
  },
  {
    url:    "https://images.pexels.com/photos/1252843/pexels-photo-1252843.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1516912799-8f4ec627d5f4?w=1280&q=75&auto=format&fit=crop",
    label:  "Северное сияние",
  },
  {
    url:    "https://images.pexels.com/photos/2225542/pexels-photo-2225542.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=1280&q=75&auto=format&fit=crop",
    label:  "Звёзды над горами",
  },
  {
    url:    "https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1445905595283-21f8ae8a33d2?w=1280&q=75&auto=format&fit=crop",
    label:  "Ночные горы",
  },
  {
    url:    "https://images.pexels.com/photos/1738434/pexels-photo-1738434.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1280&q=75&auto=format&fit=crop",
    label:  "Звёздное небо",
  },
  {
    url:    "https://images.pexels.com/photos/592750/pexels-photo-592750.jpeg?auto=compress&cs=tinysrgb&w=960&q=80",
    backup: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=75&auto=format&fit=crop",
    label:  "Полярное сияние",
  },
];

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];
const SHOW_MS = 14_000; // 14 сек на фото
const FADE_MS =  1_800; // 1.8 сек появление

function guessIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const s = localStorage.getItem("theme");
    if (s === "light") return false;
    if (s === "dark")  return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return true; }
}

// Состояние каждого слота: "idle" | "primary" | "backup" | "failed"
type SlotState = "idle" | "primary" | "backup" | "failed";

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted]       = useState(false);
  const [cur, setCur]               = useState(0);
  const [next, setNext]             = useState(1);
  const [appearing, setAppearing]   = useState(false);
  const [slotState, setSlotState]   = useState<Record<number, SlotState>>({});
  const [tabHidden, setTabHidden]   = useState(false); // Page Visibility API
  const [isMobile, setIsMobile]     = useState(false);
  const prevIsDark                  = useRef<boolean | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Пауза анимаций когда вкладка скрыта (экономим батарею) ──────────────────
  useEffect(() => {
    const onChange = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isDark  = mounted ? resolvedTheme !== "light" : guessIsDark();
  const PHOTOS  = isDark ? NIGHT : DAY;

  function getSrc(idx: number): string | null {
    const st = slotState[idx];
    if (st === "failed") return null;
    if (st === "backup") return PHOTOS[idx]?.backup ?? null;
    return PHOTOS[idx]?.url ?? null;
  }

  function handleError(idx: number) {
    const st = slotState[idx] ?? "idle";
    if (st === "primary" || st === "idle") {
      // пробуем backup
      setSlotState(s => ({ ...s, [idx]: "backup" }));
    } else {
      // backup тоже не загрузился — помечаем как failed
      setSlotState(s => ({ ...s, [idx]: "failed" }));
    }
  }

  // Сброс при смене темы
  useEffect(() => {
    if (!mounted) return;
    if (prevIsDark.current !== null && prevIsDark.current !== isDark) {
      setAppearing(false);
      setCur(0); setNext(1); setSlotState({});
    }
    prevIsDark.current = isDark;
  }, [isDark, mounted]);

  // Автосмена фото — останавливается когда вкладка скрыта (батарея)
  useEffect(() => {
    if (!enabled || tabHidden) return;
    const t = setInterval(() => {
      const n = (cur + 1) % PHOTOS.length;
      setNext(n);
      setAppearing(true);
      setTimeout(() => {
        setCur(n);
        setAppearing(false);
      }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, tabHidden, cur, PHOTOS.length]);

  if (!enabled) return null;

  const curSrc  = getSrc(cur);
  const nextSrc = getSrc(next);
  const prefetchIdx = (cur + 2) % PHOTOS.length;
  const prefetchSrc = getSrc(prefetchIdx);

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* ── Слой 1: CSS градиент-блобы (мгновенно, всегда работают) ── */}
      <div className="absolute inset-0 transition-colors duration-1000"
        style={{ background: isDark ? "#040b14" : "#daedf5" }} />
      {/* На мобильном blur убран — экономим GPU, телефон не греется */}
      <div className="absolute inset-0" style={{ filter: isMobile ? "none" : "blur(100px)", opacity: isMobile ? 0.70 : 0.90 }}>
        {/* animationPlayState: paused когда вкладка скрыта — экономим CPU/GPU */}
        {isDark ? (
          <>
            <div className="absolute rounded-full" style={{ width:"65%", height:"65%", top:"5%",   left:"-5%", background:"radial-gradient(circle, #0d3d28 0%, transparent 70%)", animation:"aray-blob-1 20s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"58%", height:"58%", top:"45%",  left:"48%", background:"radial-gradient(circle, #0a1e3d 0%, transparent 70%)", animation:"aray-blob-2 24s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"52%", height:"52%", top:"25%",  left:"35%", background:"radial-gradient(circle, #14093a 0%, transparent 70%)", animation:"aray-blob-3 18s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"44%", height:"44%", top:"60%",  left:"5%",  background:"radial-gradient(circle, #082a18 0%, transparent 70%)", animation:"aray-blob-4 22s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"36%", height:"36%", top:"-5%",  left:"55%", background:"radial-gradient(circle, #1a0a3a 0%, transparent 70%)", animation:"aray-blob-5 28s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
          </>
        ) : (
          <>
            <div className="absolute rounded-full" style={{ width:"70%", height:"70%", top:"-5%",  left:"-8%", background:"radial-gradient(circle, #60c5a8 0%, transparent 70%)", animation:"aray-blob-1 20s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"60%", height:"60%", top:"40%",  left:"45%", background:"radial-gradient(circle, #6ab8e0 0%, transparent 70%)", animation:"aray-blob-2 24s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"55%", height:"55%", top:"20%",  left:"30%", background:"radial-gradient(circle, #78c895 0%, transparent 70%)", animation:"aray-blob-3 18s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"48%", height:"48%", top:"58%",  left:"2%",  background:"radial-gradient(circle, #94d4c8 0%, transparent 70%)", animation:"aray-blob-4 22s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
            <div className="absolute rounded-full" style={{ width:"40%", height:"40%", top:"-8%",  left:"60%", background:"radial-gradient(circle, #4ab8d8 0%, transparent 70%)", animation:"aray-blob-5 26s ease-in-out infinite", animationPlayState: tabHidden ? "paused" : "running" }} />
          </>
        )}
      </div>

      {/* ── Слой 2: Текущее фото — только на desktop (mobile: только CSS градиент для производительности) ── */}
      {curSrc && !isMobile && (
        <div className="absolute inset-0">
          <img
            key={`cur-${cur}-${isDark}`}
            src={curSrc}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[cur % 3]} ${SHOW_MS}ms ease-in-out forwards`, animationPlayState: tabHidden ? "paused" : "running" }}
            onError={() => handleError(cur)}
          />
        </div>
      )}

      {/* ── Слой 3: Следующее фото — только desktop ── */}
      {nextSrc && !isMobile && (
        <div
          className="absolute inset-0"
          style={{
            opacity:   appearing ? 1 : 0,
            transform: appearing ? "scale(1)" : "scale(1.04)",
            transition: appearing
              ? `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1), transform ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`
              : "none",
          }}
        >
          <img
            key={`next-${next}-${isDark}`}
            src={nextSrc}
            alt=""
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${ANIMS[next % 3]} ${SHOW_MS}ms ease-in-out forwards`, animationPlayState: tabHidden ? "paused" : "running" }}
            onError={() => handleError(next)}
          />
        </div>
      )}

      {/* Предзагрузка следующего (невидимо) — только desktop */}
      {prefetchSrc && !isMobile && (
        <img
          key={`pre-${prefetchIdx}`}
          src={prefetchSrc}
          alt=""
          decoding="async"
          fetchPriority="low"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
        />
      )}

      {/* ── Оверлеи для читабельности ── */}
      <div className="aray-photo-overlay-dark  absolute inset-0" style={{ background: "rgba(4,8,18,0.46)" }} />
      <div className="aray-photo-overlay-dark  absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,8,18,0.76) 0%, rgba(4,8,18,0.08) 42%, transparent 65%)" }} />
      <div className="aray-photo-overlay-dark  absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(4,8,18,0.38) 0%, transparent 30%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(10,20,40,0.28)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,8,18,0.55) 0%, transparent 52%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(4,8,18,0.32) 0%, transparent 28%)" }} />

      {/* ── Лейбл фото ── */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.22 }}>
        <span className="text-white text-[9px]">{isDark ? "🌙" : "☀️"}</span>
        <span className="w-px h-3 bg-white/50" />
        <span className="text-white text-[9px] tracking-[0.22em] uppercase font-light">
          {getSrc(cur) === null ? (isDark ? "ARAY · Ночь" : "ARAY · День") : PHOTOS[cur]?.label}
        </span>
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
      </div>

    </div>
  );
}
