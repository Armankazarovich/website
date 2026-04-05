"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

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
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        style={{ backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, side panel on desktop */}
      <div
        ref={panelRef}
        className={`
          relative z-10 flex flex-col
          w-full lg:w-[520px] xl:w-[580px]
          rounded-t-[28px] lg:rounded-none lg:rounded-l-[28px]
          overflow-hidden
          animate-in slide-in-from-bottom lg:slide-in-from-right duration-300
        `}
        style={{
          maxHeight: "92dvh",
          background: "rgba(6, 9, 22, 0.97)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.6), -4px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-bold text-white leading-tight truncate">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-white/45 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ml-3 transition-all active:scale-90 hover:bg-white/10"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <X className="w-4 h-4 text-white/60" />
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
