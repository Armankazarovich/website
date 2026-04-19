"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface AdminQuickViewProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Размер попапа: sm (420), md (560), lg (720), xl (900). По умолчанию lg */
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Универсальный Quick View попап — ARAY POPUP стандарт.
 * Мобильный: поднимается снизу (bottom sheet) — автоматически через CSS
 * Десктоп: центрированный попап
 * Закрывается по клику на backdrop, кнопку X или Escape
 */
export function AdminQuickView({ open, onClose, title, subtitle, children, size = "lg" }: AdminQuickViewProps) {
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

  const sizeClass = {
    sm: "arayglass-popup-sm",
    md: "arayglass-popup-md",
    lg: "arayglass-popup-lg",
    xl: "arayglass-popup-xl",
  }[size];

  return (
    <>
      {/* ARAY POPUP */}
      <div className="arayglass-popup-backdrop" onClick={onClose} />
      <div className="arayglass-popup-container">
        <div className={`arayglass-popup ${sizeClass}`} role="dialog" aria-label={title || "Quick View"}>

          {/* Header */}
          {(title || subtitle) && (
            <div className="arayglass-popup-header flex items-center justify-between">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 className="text-base font-bold leading-tight truncate text-foreground">{title}</h2>
                )}
                {subtitle && (
                  <p className="text-xs mt-0.5 truncate text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ml-3 transition-all active:scale-90 text-muted-foreground hover:text-foreground hover:bg-primary/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="arayglass-popup-body">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
