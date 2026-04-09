"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

function useClassicMode() {
  const [classic, setClassic] = useState(false);
  useEffect(() => {
    setClassic(localStorage.getItem("aray-classic-mode") === "1");
    const h = () => setClassic(localStorage.getItem("aray-classic-mode") === "1");
    window.addEventListener("aray-classic-change", h);
    return () => window.removeEventListener("aray-classic-change", h);
  }, []);
  return classic;
}

interface AdminQuickViewProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Универсальный Quick View попап — новое поколение ARAY UI.
 * Мобильный: поднимается снизу (bottom sheet)
 * Десктоп: появляется справа (side panel)
 * Закрывается по клику на backdrop или кнопку X
 */
export function AdminQuickView({ open, onClose, title, subtitle, children }: AdminQuickViewProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const classic = useClassicMode();

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Блокировка скролла body
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end lg:items-stretch lg:justify-end">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        style={{ backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, right side panel on desktop */}
      <div
        ref={panelRef}
        className={`
          relative z-10 flex flex-col
          w-full lg:w-[460px] lg:max-w-[460px]
          rounded-t-[28px] lg:rounded-none lg:rounded-l-[28px]
          overflow-hidden
          animate-in slide-in-from-bottom lg:slide-in-from-right duration-300
          max-h-[92dvh] lg:max-h-full lg:h-full
        `}
        style={classic ? {
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.12)",
        } : {
          background: "rgba(8, 13, 32, 0.82)",
          backdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
          WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05) inset",
        }}
      >
        {/* Drag handle (mobile only) */}
        <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-bold leading-tight truncate" style={{ color: classic ? "hsl(var(--foreground))" : "#fff" }}>{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5 truncate" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.45)" }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ml-3 transition-all active:scale-90 hover:bg-primary/[0.06]"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <X className="w-4 h-4" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.6)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
          <div style={{ height: "max(16px, env(safe-area-inset-bottom, 16px))" }} />
        </div>
      </div>
    </div>
  );
}
