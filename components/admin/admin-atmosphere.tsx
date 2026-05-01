"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ADMIN_ATMOSPHERE_PHOTOS } from "@/lib/admin-atmospheres";

export type AdminBgMode = "clean" | "photo";

const PHOTO_MS = 28_000;
const FADE_MS = 2_400;

function normalizeMode(mode: string | null | undefined): AdminBgMode {
  if (mode === "photo" || mode === "video") return "photo";
  if (mode === "clean") return "clean";
  return mode === "classic" ? "clean" : "photo";
}

function preloadPhotos(srcs: string[]) {
  if (typeof window === "undefined") return;
  for (const src of srcs.slice(0, 3)) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function AdminAtmosphere({ mode }: { mode: string | null | undefined }) {
  const bgMode = normalizeMode(mode);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme !== "light" : true;
  const atmospherePhotos = useMemo(() => ADMIN_ATMOSPHERE_PHOTOS, []);
  const [photos, setPhotos] = useState<string[]>(atmospherePhotos);
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
    setPhotos(atmospherePhotos);
    setIndex(0);
    setVisibleIndex(0);
    preloadPhotos(atmospherePhotos);
  }, [atmospherePhotos, bgMode]);

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

  const fallbackPhoto = atmospherePhotos[0];
  const currentPhoto = photos[visibleIndex % photos.length] || fallbackPhoto;
  const nextPhoto = photos[index % photos.length] || currentPhoto;
  const duration = PHOTO_MS;
  const solidOverlay = isDark
    ? isMobile ? "rgba(5,6,7,0.76)" : "rgba(5,6,7,0.82)"
    : isMobile ? "rgba(250,249,246,0.56)" : "rgba(250,249,246,0.64)";
  const depthOverlay = isDark
    ? isMobile
      ? "linear-gradient(to bottom, rgba(5,6,7,0.62) 0%, rgba(5,6,7,0.20) 38%, rgba(5,6,7,0.76) 100%)"
      : "linear-gradient(to bottom, rgba(5,6,7,0.72) 0%, rgba(5,6,7,0.24) 38%, rgba(5,6,7,0.82) 100%)"
    : isMobile
      ? "linear-gradient(to bottom, rgba(252,251,248,0.68) 0%, rgba(252,251,248,0.44) 38%, rgba(252,251,248,0.78) 100%)"
      : "linear-gradient(to bottom, rgba(252,251,248,0.74) 0%, rgba(252,251,248,0.50) 38%, rgba(252,251,248,0.82) 100%)";

  if (bgMode === "clean" || !fallbackPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{ background: isDark ? "#050607" : "#f7f5f1" }}
      />

      <AtmosphereFrame
        photo={currentPhoto}
        motionIndex={visibleIndex}
        duration={duration}
        disabled={tabHidden || isMobile}
        isDark={isDark}
        isMobile={isMobile}
        fallbackPhoto={fallbackPhoto}
      />
      {nextPhoto !== currentPhoto && !isMobile && (
        <AtmosphereFrame
          photo={nextPhoto}
          motionIndex={index}
          duration={duration}
          disabled={tabHidden}
          isDark={isDark}
          isMobile={isMobile}
          fallbackPhoto={fallbackPhoto}
          entering
        />
      )}

      <div
        className="absolute inset-0"
        style={{ background: solidOverlay }}
      />
      <div
        className="absolute inset-0"
        style={{ background: depthOverlay }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, hsl(var(--primary) / 0.08) 0%, transparent 34%, rgba(0,0,0,0.08) 100%)",
          mixBlendMode: isDark ? "screen" : "multiply",
          opacity: isDark ? 0.10 : 0.08,
        }}
      />
    </div>
  );
}

function AtmosphereFrame({
  photo,
  motionIndex,
  duration,
  disabled,
  isDark,
  isMobile,
  fallbackPhoto,
  entering = false,
}: {
  photo: string;
  motionIndex: number;
  duration: number;
  disabled: boolean;
  isDark: boolean;
  isMobile: boolean;
  fallbackPhoto: string;
  entering?: boolean;
}) {
  const kenburns = ["kenburns-in", "kenburns-2", "kenburns-3"][motionIndex % 3];

  return (
    <div
      key={`${entering ? "next" : "current"}-${photo}`}
      className="absolute -inset-5"
      style={{
        animation: entering && !disabled
          ? `adminAtmosphereSlideFade ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`
          : "none",
        opacity: entering ? 0 : 1,
      }}
    >
      <img
        src={photo}
        alt=""
        className="h-full w-full object-cover"
        onError={(event) => {
          if (fallbackPhoto && event.currentTarget.src !== new URL(fallbackPhoto, window.location.origin).href) {
            event.currentTarget.src = fallbackPhoto;
            return;
          }
          event.currentTarget.style.display = "none";
        }}
        style={{
          animation: disabled ? "none" : `${kenburns} ${duration}ms ease-in-out forwards`,
          opacity: isDark ? (isMobile ? 0.36 : 0.42) : (isMobile ? 0.30 : 0.28),
          filter: isDark
            ? isMobile
              ? "blur(8px) saturate(0.82) contrast(0.94) brightness(0.76)"
              : "blur(11px) saturate(0.78) contrast(0.90) brightness(0.70)"
            : isMobile
              ? "blur(13px) saturate(0.68) contrast(0.88) brightness(1.08)"
              : "blur(16px) saturate(0.62) contrast(0.86) brightness(1.10)",
        }}
      />
    </div>
  );
}
