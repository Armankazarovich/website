"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type AdminBgMode = "clean" | "photo" | "video";

const DEFAULT_PHOTOS = [
  "/images/production/hero-main.jpg",
  "/images/production/hero-about.jpg",
  "/images/production/hero-cta.jpg",
  "/images/production/sklad-1.jpg",
  "/images/production/sklad-2.jpg",
];

const PHOTO_MS = 18_000;
const CINEMA_MS = 11_000;
const FADE_MS = 1_800;

function normalizeMode(mode: string | null | undefined): AdminBgMode {
  if (mode === "photo" || mode === "video" || mode === "clean") return mode;
  return mode === "classic" ? "clean" : "clean";
}

export function AdminAtmosphere({ mode }: { mode: string | null | undefined }) {
  const bgMode = normalizeMode(mode);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [photos, setPhotos] = useState<string[]>(DEFAULT_PHOTOS);
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
        setPhotos(userPhotos.length > 0 ? userPhotos : DEFAULT_PHOTOS);
      })
      .catch(() => {
        if (alive) setPhotos(DEFAULT_PHOTOS);
      });
    return () => {
      alive = false;
    };
  }, [bgMode]);

  useEffect(() => {
    if (bgMode === "clean" || tabHidden || photos.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, bgMode === "video" ? CINEMA_MS : PHOTO_MS);
    return () => window.clearInterval(timer);
  }, [bgMode, photos.length, tabHidden]);

  useEffect(() => {
    if (bgMode === "clean") return;
    const timer = window.setTimeout(() => setVisibleIndex(index), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [bgMode, index]);

  const isDark = mounted ? resolvedTheme !== "light" : true;
  const currentPhoto = photos[visibleIndex % photos.length] || DEFAULT_PHOTOS[0];
  const nextPhoto = photos[index % photos.length] || currentPhoto;
  const duration = bgMode === "video" ? CINEMA_MS : PHOTO_MS;

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
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          animation: tabHidden || isMobile ? "none" : `${["kenburns-in", "kenburns-2", "kenburns-3"][visibleIndex % 3]} ${duration}ms ease-in-out forwards`,
          filter: bgMode === "video" ? "saturate(1.06) contrast(1.04)" : undefined,
        }}
      />
      {nextPhoto !== currentPhoto && !isMobile && (
        <img
          key={`next-${nextPhoto}`}
          src={nextPhoto}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            animation: tabHidden
              ? "none"
              : `adminAtmosphereFade ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards, ${["kenburns-2", "kenburns-3", "kenburns-in"][index % 3]} ${duration}ms ease-in-out forwards`,
            filter: bgMode === "video" ? "saturate(1.06) contrast(1.04)" : undefined,
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{ background: isDark ? "rgba(6,5,4,0.70)" : "rgba(20,13,8,0.42)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,6,5,0.54) 0%, rgba(8,6,5,0.18) 36%, rgba(8,6,5,0.66) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, hsl(var(--primary) / 0.20) 0%, transparent 32%, rgba(0,0,0,0.12) 100%)",
          mixBlendMode: isDark ? "screen" : "multiply",
          opacity: isDark ? 0.26 : 0.18,
        }}
      />
    </div>
  );
}
