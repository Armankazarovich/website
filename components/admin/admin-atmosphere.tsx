"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { usePalette } from "@/components/palette-provider";
import { getPalettePhotos } from "@/lib/admin-atmospheres";

export type AdminBgMode = "clean" | "photo";

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
  const { palette } = usePalette();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme !== "light" : true;
  const palettePhotos = getPalettePhotos(palette);
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
    let alive = true;
    fetch("/api/admin/user-bg", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return;
        const userPhotos = Array.isArray(data?.photos) ? data.photos.filter(Boolean) : [];
        setPhotos(userPhotos.length > 0 ? userPhotos : palettePhotos);
        setIndex(0);
        setVisibleIndex(0);
      })
      .catch(() => {
        if (alive) setPhotos(palettePhotos);
      });
    return () => {
      alive = false;
    };
  }, [bgMode, palette]);

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

  const currentPhoto = photos[visibleIndex % photos.length] || palettePhotos[0];
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

      <AtmosphereFrame
        photo={currentPhoto}
        motionIndex={visibleIndex}
        duration={duration}
        disabled={tabHidden || isMobile}
        isDark={isDark}
      />
      {nextPhoto !== currentPhoto && !isMobile && (
        <AtmosphereFrame
          photo={nextPhoto}
          motionIndex={index}
          duration={duration}
          disabled={tabHidden}
          isDark={isDark}
          entering
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

function AtmosphereFrame({
  photo,
  motionIndex,
  duration,
  disabled,
  isDark,
  entering = false,
}: {
  photo: string;
  motionIndex: number;
  duration: number;
  disabled: boolean;
  isDark: boolean;
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
        style={{
          animation: disabled ? "none" : `${kenburns} ${duration}ms ease-in-out forwards`,
          opacity: isDark ? 0.66 : 0.24,
          filter: isDark
            ? "blur(11px) saturate(0.82) contrast(0.9) brightness(0.66)"
            : "blur(16px) saturate(0.48) contrast(0.84) brightness(1.14)",
        }}
      />
    </div>
  );
}
