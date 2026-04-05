"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

function guessIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const s = localStorage.getItem("theme");
    if (s === "light") return false;
    if (s === "dark")  return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return true; }
}

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted ? resolvedTheme !== "light" : guessIsDark();

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* ── База ── */}
      <div className="absolute inset-0 transition-colors duration-1000"
        style={{ background: isDark ? "#040b14" : "#e8f2ee" }} />

      {/* ── Живые блобы — дышащий mesh ── */}
      <div className="absolute inset-0" style={{ filter: "blur(90px)" }}>
        {isDark ? (
          <>
            {/* Лесной зелёный */}
            <div className="absolute rounded-full"
              style={{
                width: "65%", height: "65%", top: "5%", left: "-5%",
                background: "radial-gradient(circle, #0d3d28 0%, transparent 72%)",
                animation: "aray-blob-1 20s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Глубокий океан */}
            <div className="absolute rounded-full"
              style={{
                width: "58%", height: "58%", top: "45%", left: "48%",
                background: "radial-gradient(circle, #0a1e3d 0%, transparent 72%)",
                animation: "aray-blob-2 24s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Тёмный индиго */}
            <div className="absolute rounded-full"
              style={{
                width: "52%", height: "52%", top: "25%", left: "35%",
                background: "radial-gradient(circle, #14093a 0%, transparent 72%)",
                animation: "aray-blob-3 18s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Тёмный лес */}
            <div className="absolute rounded-full"
              style={{
                width: "44%", height: "44%", top: "60%", left: "5%",
                background: "radial-gradient(circle, #082a18 0%, transparent 72%)",
                animation: "aray-blob-4 22s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Ночное небо */}
            <div className="absolute rounded-full"
              style={{
                width: "42%", height: "42%", top: "-5%", left: "62%",
                background: "radial-gradient(circle, #060e22 0%, transparent 72%)",
                animation: "aray-blob-5 16s ease-in-out infinite",
                willChange: "transform",
              }} />
          </>
        ) : (
          <>
            {/* Мята */}
            <div className="absolute rounded-full"
              style={{
                width: "70%", height: "70%", top: "-5%", left: "-8%",
                background: "radial-gradient(circle, #8ecfb5 0%, transparent 72%)",
                animation: "aray-blob-1 20s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Небесный */}
            <div className="absolute rounded-full"
              style={{
                width: "60%", height: "60%", top: "40%", left: "45%",
                background: "radial-gradient(circle, #92c4e0 0%, transparent 72%)",
                animation: "aray-blob-2 24s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Шалфей */}
            <div className="absolute rounded-full"
              style={{
                width: "55%", height: "55%", top: "20%", left: "30%",
                background: "radial-gradient(circle, #a8d4b0 0%, transparent 72%)",
                animation: "aray-blob-3 18s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Светлый бирюзовый */}
            <div className="absolute rounded-full"
              style={{
                width: "48%", height: "48%", top: "58%", left: "2%",
                background: "radial-gradient(circle, #b8ddd0 0%, transparent 72%)",
                animation: "aray-blob-4 22s ease-in-out infinite",
                willChange: "transform",
              }} />
            {/* Лавандово-голубой */}
            <div className="absolute rounded-full"
              style={{
                width: "45%", height: "45%", top: "-2%", left: "60%",
                background: "radial-gradient(circle, #a5c8e0 0%, transparent 72%)",
                animation: "aray-blob-5 16s ease-in-out infinite",
                willChange: "transform",
              }} />
          </>
        )}
      </div>

      {/* ── Оверлеи для читаемости ── */}
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "rgba(2, 8, 18, 0.42)" }} />
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(2,8,18,0.72) 0%, rgba(2,8,18,0.08) 40%, transparent 65%)" }} />
      <div className="aray-photo-overlay-dark  absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(2,8,18,0.45) 0%, transparent 32%)" }} />

      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.14) 0%, transparent 52%)" }} />

      {/* ── Лейбл ── */}
      <div className="absolute bottom-3 right-5 flex items-center gap-2" style={{ opacity: 0.20 }}>
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
        <span className="text-white text-[9px] tracking-[0.22em] uppercase font-light">
          {isDark ? "ARAY · Тёмная" : "ARAY · Светлая"}
        </span>
      </div>

    </div>
  );
}
