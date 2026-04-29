"use client";

import { useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { UI_LAYERS } from "@/lib/ui-layers";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Заголовок в шапке (строка или нод для кастомного рендера) */
  title?: ReactNode;
  /** Подпись под заголовком */
  subtitle?: ReactNode;
  /** Иконка слева от заголовка */
  icon?: ReactNode;
  /** Цвет бейджа иконки — классы Tailwind, например "bg-primary/10 text-primary" */
  iconTone?: string;
  /** Контент панели */
  children: ReactNode;
  /** Футер (кнопки, итоги) — прикреплён к низу */
  footer?: ReactNode;
  /** Ширина панели (по умолчанию 92vw / max 480px) */
  maxWidth?: string;
  /** z-index (по умолчанию z-[200]) */
  zIndex?: string;
  /** Показывать ли кастомную шапку (по умолчанию да) */
  showHeader?: boolean;
  /** Кастомный baseline-хедер (переопределяет стандартный рендер) */
  customHeader?: ReactNode;
  /**
   * С какой стороны выезжает панель.
   * Сессия 39 (28.04.2026): дефолт "left" по решению Армана —
   * "попапы все с левой стороны мой брат, в магазине так же,
   * систему меняем". Справа всегда остаётся пустым под Арая.
   */
  side?: "left" | "right";
}

/**
 * Универсальный боковой попап — правая колонка, full-height, анимация spring-in.
 * Одна семантика для корзины, форм заявок, фильтров и т.д.
 * Закрывается по клику на подложку, Escape и крестик.
 */
export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = "bg-primary/10 text-primary",
  children,
  footer,
  maxWidth = "480px",
  zIndex = UI_LAYERS.overlay,
  showHeader = true,
  customHeader,
  side = "right",
}: Props) {
  const isLeft = side === "left";
  // Escape + lock body scroll
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 ${zIndex} flex ${isLeft ? "justify-start" : "justify-end"}`}
          onClick={() => onClose()}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: isLeft ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: isLeft ? "-100%" : "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className={`relative w-[92vw] h-full bg-background ${isLeft ? "border-r" : "border-l"} border-border shadow-2xl flex flex-col overflow-hidden`}
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {customHeader ? (
              customHeader
            ) : showHeader ? (
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}
                    >
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && (
                      <h3 className="font-display font-semibold text-lg leading-none truncate">
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors shrink-0"
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            {/* Body (scrollable) */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-border shrink-0">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
