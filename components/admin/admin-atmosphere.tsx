"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type AdminBgMode = "clean" | "photo";

const DARK_NATURE_PHOTOS = [
  "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=1800&q=72",
  "https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&w=1800&q=72",
  "https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=1800&q=72",
  "https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1800&q=72",
  "https://images.pexels.com/photos/933054/pexels-photo-933054.jpeg?auto=compress&cs=tinysrgb&w=1800&q=72",
];

const LIGHT_WINTER_PHOTOS = [
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=72",
  "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1800&q=72",
  "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=1800&q=72",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=72",
];

const PHOTO_MS = 28_000;
const FADE_MS = 2_400;

function normalizeMode(mode: string | null | undefined): AdminBgMode {
  if (mode === "photo" || mode === "video") return "photo";
  if (mode === "clean") return "clean";
  return mode === "classic" ? "clean" : "clean";
}

export function AdminAtmosphere({ mode }: { mode: string | null | undefined }) {
  const bgMode = normalizeMode(mode);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme !== "light" : true;
  const themedPhotos = isDark ? DARK_NATURE_PHOTOS : LIGHT_WINTER_PHOTOS;
  const [photos, setPhotos] = useState<string[]>(themedPhotos);
  const [index, setIndex] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [tabHidden, setTabHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (bgMode === "clean") return;
    let alive = true;
    fetch("/api/admin/user-bg", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return;
        const userPhotos = Array.isArray(data?.photos) ? data.photos.filter(Boolean) : [];
        setPhotos(userPhotos.length > 0 ? userPhotos : themedPhotos);
      })
      .catch(() => {
        if (alive) setPhotos(themedPhotos);
      });
    return () => {
      alive = false;
    };
  }, [bgMode, isDark]);

  useEffect(() => {
    if (bgMode === "clean" || tabHidden || photos.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, PHOTO_MS);
    return () => window.clearInterval(timer);
  }, [bgMode, photos.length, tabHidden]);

  useEffect(() => {
    if (bgMode === "clean") return;
    const timer = window.setTimeout(() => setVisibleIndex(index), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [bgMode, index]);

  const currentPhoto = photos[visibleIndex % photos.length] || themedPhotos[0];
  const nextPhoto = photos[index % photos.length] || currentPhoto;
  const duration = PHOTO_MS;

  if (bgMode === "clean") return null;

  return (
    <div
      className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{ background: isDark ? "#090705" : "#f5f1eb" }}
      />

      <img
        key={`current-${currentPhoto}`}
        src={currentPhoto}
        alt=""
        className="absolute -inset-5 h-[calc(100%+40px)] w-[calc(100%+40px)] object-cover"
        style={{
          animation: tabHidden || isMobile ? "none" : `${["kenburns-in", "kenburns-2", "kenburns-3"][visibleIndex % 3]} ${duration}ms ease-in-out forwards`,
          opacity: isDark ? 0.68 : 0.22,
          filter: isDark
            ? "blur(12px) saturate(0.72) contrast(0.88) brightness(0.68)"
            : "blur(16px) saturate(0.45) contrast(0.82) brightness(1.12)",
        }}
      />
      {nextPhoto !== currentPhoto && !isMobile && (
        <img
          key={`next-${nextPhoto}`}
          src={nextPhoto}
          alt=""
          className="absolute -inset-5 h-[calc(100%+40px)] w-[calc(100%+40px)] object-cover"
          style={{
            animation: tabHidden
              ? "none"
              : `adminAtmosphereFade ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards, ${["kenburns-2", "kenburns-3", "kenburns-in"][index % 3]} ${duration}ms ease-in-out forwards`,
            opacity: isDark ? 0.68 : 0.22,
            filter: isDark
              ? "blur(12px) saturate(0.72) contrast(0.88) brightness(0.68)"
              : "blur(16px) saturate(0.45) contrast(0.82) brightness(1.12)",
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{ background: isDark ? "rgba(7,6,5,0.84)" : "rgba(248,247,244,0.76)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            isDark
              ? "linear-gradient(to bottom, rgba(8,6,5,0.74) 0%, rgba(8,6,5,0.34) 38%, rgba(8,6,5,0.82) 100%)"
              : "linear-gradient(to bottom, rgba(252,250,247,0.86) 0%, rgba(252,250,247,0.66) 38%, rgba(252,250,247,0.88) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, hsl(var(--primary) / 0.12) 0%, transparent 34%, rgba(0,0,0,0.10) 100%)",
          mixBlendMode: isDark ? "screen" : "multiply",
          opacity: isDark ? 0.20 : 0.12,
        }}
      />
    </div>
  );
}
