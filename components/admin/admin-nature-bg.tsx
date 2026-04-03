"use client";

import { useEffect, useState, useCallback } from "react";

// ── Дефолтные природные фото (если у пользователя нет своих) ──────────────────
const DEFAULT_PHOTOS = [
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

const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];

const SHOW_MS = 20_000; // 20 сек на каждое фото
const FADE_MS =  4_000; // 4 сек плавный переход

interface Photo { url: string; label: string; anim: string; }

interface AdminNatureBgProps {
  enabled: boolean;
  // Если переданы — используем их, иначе загружаем из API
  customPhotos?: string[];
}

export function AdminNatureBg({ enabled, customPhotos }: AdminNatureBgProps) {
  const [photos, setPhotos] = useState<Photo[]>(DEFAULT_PHOTOS);
  const [cur,  setCur]  = useState(0);
  const [next, setNext] = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Загрузка персональных фото с API
  const fetchUserPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/user-bg");
      if (!res.ok) return;
      const data = await res.json();
      if (data.photos?.length > 0) {
        const userPhotos: Photo[] = data.photos.map((url: string, i: number) => ({
          url,
          label: `Фото ${i + 1}`,
          anim: ANIMS[i % ANIMS.length],
        }));
        setPhotos(userPhotos);
        setCur(0);
        setNext(Math.min(1, userPhotos.length - 1));
        setFailed(new Set());
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Если переданы кастомные фото извне (из AdminBgPicker) — используем их
  useEffect(() => {
    if (customPhotos !== undefined) {
      if (customPhotos.length > 0) {
        const userPhotos: Photo[] = customPhotos.map((url, i) => ({
          url,
          label: `Фото ${i + 1}`,
          anim: ANIMS[i % ANIMS.length],
        }));
        setPhotos(userPhotos);
        setCur(0);
        setNext(Math.min(1, userPhotos.length - 1));
        setFailed(new Set());
      } else {
        setPhotos(DEFAULT_PHOTOS);
        setCur(0);
        setNext(1);
        setFailed(new Set());
      }
      setLoaded(true);
    }
  }, [customPhotos]);

  // Первичная загрузка (только если не переданы customPhotos извне)
  useEffect(() => {
    if (enabled && customPhotos === undefined) {
      fetchUserPhotos();
    }
  }, [enabled, customPhotos, fetchUserPhotos]);

  // Слушаем событие обновления фона (от AdminBgPicker)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const newPhotos: string[] = e.detail?.photos || [];
      if (newPhotos.length > 0) {
        setPhotos(newPhotos.map((url, i) => ({
          url,
          label: `Фото ${i + 1}`,
          anim: ANIMS[i % ANIMS.length],
        })));
      } else {
        setPhotos(DEFAULT_PHOTOS);
      }
      setCur(0);
      setNext(Math.min(1, newPhotos.length > 0 ? newPhotos.length - 1 : DEFAULT_PHOTOS.length - 1));
      setFailed(new Set());
    };
    window.addEventListener("aray:bg-updated", handler as EventListener);
    return () => window.removeEventListener("aray:bg-updated", handler as EventListener);
  }, []);

  // Таймер смены фото
  useEffect(() => {
    if (!enabled || photos.length < 2) return;
    const t = setInterval(() => {
      setFading(true);
      const n = (cur + 1) % photos.length;
      setNext(n);
      setTimeout(() => { setCur(n); setFading(false); }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, cur, photos.length]);

  if (!enabled) return null;

  const currentPhoto = photos[cur];
  const nextPhoto = photos[next];

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* Текущее фото */}
      {currentPhoto && !failed.has(cur) && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
        >
          <img
            src={currentPhoto.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation: `${currentPhoto.anim} ${SHOW_MS}ms ease-in-out forwards`,
              willChange: "transform",
            }}
            onError={() => setFailed(f => new Set([...f, cur]))}
          />
        </div>
      )}

      {/* Следующее фото (предзагрузка + появляется при fade) */}
      {nextPhoto && !failed.has(next) && next !== cur && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        >
          <img
            src={nextPhoto.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation: `${nextPhoto.anim} ${SHOW_MS}ms ease-in-out forwards`,
              willChange: "transform",
            }}
            onError={() => setFailed(f => new Set([...f, next]))}
          />
        </div>
      )}

      {/* ТЁМНАЯ ТЕМА — затемнение */}
      <div className="aray-photo-overlay-dark absolute inset-0 bg-black/48" />
      {/* СВЕТЛАЯ ТЕМА — лёгкий туман */}
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(255,255,255,0.18)" }} />
      {/* Виньетка снизу */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 40%, transparent 65%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.22) 0%, transparent 50%)" }} />
      {/* Виньетка сверху — только тёмная тема */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 20%)" }} />

      {/* Лейбл текущего фото */}
      <div className="absolute bottom-3 right-5 flex items-center gap-1.5 opacity-25">
        <span className="w-1 h-1 rounded-full bg-white" style={{ animation: "pulse 3s ease-in-out infinite" }} />
        <span className="text-white text-[9px] tracking-[0.25em] uppercase font-light">
          {currentPhoto?.label}
        </span>
      </div>
    </div>
  );
}
