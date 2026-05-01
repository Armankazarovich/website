"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { usePalette } from "@/components/palette-provider";
import { getPalettePhotos } from "@/lib/admin-atmospheres";

export type AdminBgMode = "clean" | "photo";

const PHOTO_MS = 28_000;
const FADE_MS = 2_400;

function normalizeMode(mode: string | null | undefined): AdminBgMode {
  if (mode === "photo" || mode === "video") return "photo";
  if (mode === "clean") return "clean";
  return "clean";
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
  const { palette } = usePalette();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme !== "light" : true;
  const palettePhotos = useMemo(() => getPalettePhotos(palette), [palette]);
  const [photos, setPhotos] = useState<string[]>(palettePhotos);
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
    setPhotos(palettePhotos);
    setIndex(0);
    setVisibleIndex(0);
    preloadPhotos(palettePhotos);
  }, [bgMode, palettePhotos]);

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

  const fallbackPhoto = palettePhotos[0];
  const currentPhoto = photos[visibleIndex % photos.length] || fallbackPhoto;
  const nextPhoto = photos[index % photos.length] || currentPhoto;
  const duration = PHOTO_MS;
  const solidOverlay = isDark
    ? isMobile ? "rgba(7,6,5,0.68)" : "rgba(7,6,5,0.78)"
    : isMobile ? "rgba(248,247,244,0.58)" : "rgba(248,247,244,0.70)";
  const depthOverlay = isDark
    ? isMobile
      ? "linear-gradient(to bottom, rgba(8,6,5,0.58) 0%, rgba(8,6,5,0.18) 38%, rgba(8,6,5,0.72) 100%)"
      : "linear-gradient(to bottom, rgba(8,6,5,0.68) 0%, rgba(8,6,5,0.28) 38%, rgba(8,6,5,0.78) 100%)"
    : isMobile
      ? "linear-gradient(to bottom, rgba(252,250,247,0.70) 0%, rgba(252,250,247,0.48) 38%, rgba(252,250,247,0.78) 100%)"
      : "linear-gradient(to bottom, rgba(252,250,247,0.82) 0%, rgba(252,250,247,0.60) 38%, rgba(252,250,247,0.86) 100%)";

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
            "linear-gradient(115deg, hsl(var(--primary) / 0.12) 0%, transparent 34%, rgba(0,0,0,0.10) 100%)",
          mixBlendMode: isDark ? "screen" : "multiply",
          opacity: isDark ? 0.20 : 0.12,
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
          opacity: isDark ? (isMobile ? 0.82 : 0.72) : (isMobile ? 0.34 : 0.26),
          filter: isDark
            ? isMobile
              ? "blur(7px) saturate(0.94) contrast(0.98) brightness(0.82)"
              : "blur(10px) saturate(0.9) contrast(0.94) brightness(0.74)"
            : isMobile
              ? "blur(12px) saturate(0.62) contrast(0.88) brightness(1.08)"
              : "blur(15px) saturate(0.52) contrast(0.84) brightness(1.12)",
        }}
      />
    </div>
  );
}
