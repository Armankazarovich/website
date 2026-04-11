"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * CursorGlow — глобальное свечение курсора на карточках/панелях админки.
 * Градиент следует за мышью, цвет берётся из CSS-переменной --brand-primary.
 *
 * Работает через единственный DOM-элемент (overlay), который перемещается
 * поверх активной карточки. Нулевая нагрузка когда курсор не на карточке.
 *
 * Селекторы карточек, на которых работает свечение:
 * - .glow-card  (явный opt-in)
 * - Карточки дашборда, таблиц, панелей с border + rounded
 */

const GLOW_SELECTORS = [
  ".glow-card",
  "[data-glow]",
  "main .bg-card",
  ".aray-stat-card",
  ".aray-sidebar a",
  ".aray-sidebar button",
  ".glass-card",
].join(",");

// Радиус свечения — большой для мягкого эффекта
const GLOW_RADIUS = 340;
// Выход за границы карточки (px) — для мягкого "перелива"
const GLOW_PADDING = 60;
// Интенсивность (0-1)
const GLOW_OPACITY_DARK = 0.18;
const GLOW_OPACITY_LIGHT = 0.10;

export function CursorGlow() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const activeCardRef = useRef<HTMLElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(false);

  const updateOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const card = activeCardRef.current;
    if (!overlay || !card) return;

    const rect = card.getBoundingClientRect();
    // Координаты курсора относительно расширенного overlay (с padding)
    const x = mouseRef.current.x - rect.left + GLOW_PADDING;
    const y = mouseRef.current.y - rect.top + GLOW_PADDING;

    // Позиционируем overlay ШИРЕ карточки — свечение мягко выходит за края
    overlay.style.left = `${rect.left + window.scrollX - GLOW_PADDING}px`;
    overlay.style.top = `${rect.top + window.scrollY - GLOW_PADDING}px`;
    overlay.style.width = `${rect.width + GLOW_PADDING * 2}px`;
    overlay.style.height = `${rect.height + GLOW_PADDING * 2}px`;
    // Скруглённые углы больше чем у карточки — для мягкости
    const cardRadius = parseInt(getComputedStyle(card).borderRadius) || 12;
    overlay.style.borderRadius = `${cardRadius + GLOW_PADDING}px`;

    // Определяем тему
    const isDark = document.documentElement.classList.contains("dark");
    const opacity = isDark ? GLOW_OPACITY_DARK : GLOW_OPACITY_LIGHT;

    // Берём цвет из CSS-переменной бренда
    const brandHSL = getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-primary").trim();
    const color = brandHSL ? `hsl(${brandHSL})` : "hsl(27 91% 48%)";

    // Мягкий многослойный градиент — ядро яркое, края плавно растворяются
    overlay.style.background = `radial-gradient(${GLOW_RADIUS}px circle at ${x}px ${y}px, ${color} 0%, ${color} 8%, transparent 65%)`;
    overlay.style.opacity = String(opacity);
    overlay.style.filter = "blur(8px)";

    if (!visibleRef.current) {
      overlay.style.visibility = "visible";
      visibleRef.current = true;
    }
  }, []);

  const hideOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (overlay && visibleRef.current) {
      overlay.style.opacity = "0";
      overlay.style.visibility = "hidden";
      visibleRef.current = false;
    }
    activeCardRef.current = null;
  }, []);

  useEffect(() => {
    // Проверяем — мобильное устройство? Не подключаем
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      // Ищем ближайшую карточку
      const target = e.target as HTMLElement;
      const card = target.closest(GLOW_SELECTORS) as HTMLElement | null;

      if (card) {
        activeCardRef.current = card;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateOverlay);
      } else if (visibleRef.current) {
        hideOverlay();
      }
    };

    const handleScroll = () => {
      if (activeCardRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateOverlay);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateOverlay, hideOverlay]);

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 50,
        opacity: 0,
        visibility: "hidden",
        transition: "opacity 0.3s ease",
        willChange: "opacity, background, filter",
        mixBlendMode: "plus-lighter",
        filter: "blur(8px)",
      }}
    />
  );
}
