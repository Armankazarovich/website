"use client";

/**
 * AdminArayFloating — Арай-FAB для админки (мобилка).
 *
 * ВАЖНО: визуал НЕ меняется — используем существующий SVG-орб `<ArayOrb>`
 * (тот самый «первый шар-солнце» которого любит Арман).
 * Мы только ВЫТАСКИВАЕМ его из dock и делаем floating справа, draggable.
 *
 * Взаимодействия (сохранены как в старом dock):
 *   • Short tap (<350мс, без движения) → dispatch "aray:open" (открыть чат)
 *   • Long press (≥500мс)              → dispatch "aray:voice" (push-to-talk)
 *   • Vertical drag                    → перемещение по правому краю, Y в localStorage
 *
 * Хрестоматийно совместимо с существующим `aray-widget.tsx`, который
 * слушает события `aray:open` и `aray:voice` — поэтому ВСЯ бизнес-логика
 * (чат, голос, AI, TTS) работает без изменений.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArayOrb } from "@/components/shared/aray-orb";

const STORAGE_Y = "aray-admin-floating-y";
const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 8;
const EDGE_MARGIN = 12;
const MOBILE_BOTTOM_GUARD = 100; // над dock не залезаем

function haptic(ms = 8) {
  try { navigator.vibrate?.(ms); } catch {}
}

export function AdminArayFloating({
  hasNew = false,
  disabled = false,
}: {
  hasNew?: boolean;
  disabled?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [y, setY] = useState(0);
  const [listening, setListening] = useState(false);
  const pressRef = useRef({
    active: false, startY: 0, startPointerY: 0, moved: false,
    pointerId: 0 as number, longPressTimer: null as ReturnType<typeof setTimeout> | null,
    startedAt: 0,
  });

  const ORB_SIZE = 60;
  const WRAP_SIZE = ORB_SIZE + 12;

  const clampY = useCallback((val: number) => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return Math.max(60, Math.min(val, vh - WRAP_SIZE - MOBILE_BOTTOM_GUARD));
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedRaw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_Y) : null;
    const saved = savedRaw ? parseInt(savedRaw, 10) : NaN;
    const defaultY = typeof window !== "undefined" ? window.innerHeight * 0.5 : 400;
    setY(Number.isFinite(saved) ? clampY(saved) : clampY(defaultY));

    const onResize = () => setY((prev) => clampY(prev));
    window.addEventListener("resize", onResize);

    // Слушаем глобальные события состояния — если Арай начал слушать/говорить,
    // меняем pulse орба
    const onListening = () => setListening(true);
    const onListeningStop = () => setListening(false);
    window.addEventListener("aray:listening:start", onListening);
    window.addEventListener("aray:listening:stop", onListeningStop);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("aray:listening:start", onListening);
      window.removeEventListener("aray:listening:stop", onListeningStop);
    };
  }, [clampY]);

  // ── Pointer handlers ───────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pressRef.current.active = true;
    pressRef.current.startY = y;
    pressRef.current.startPointerY = e.clientY;
    pressRef.current.moved = false;
    pressRef.current.pointerId = e.pointerId;
    pressRef.current.startedAt = Date.now();

    pressRef.current.longPressTimer = setTimeout(() => {
      if (pressRef.current.active && !pressRef.current.moved) {
        haptic(20);
        pressRef.current.active = false;
        // Push-to-talk — старая механика, ArayWidget слушает это событие
        window.dispatchEvent(new CustomEvent("aray:voice"));
      }
    }, LONG_PRESS_MS);
  }, [y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pressRef.current.active) return;
    const dy = e.clientY - pressRef.current.startPointerY;
    if (!pressRef.current.moved && Math.abs(dy) > DRAG_THRESHOLD_PX) {
      pressRef.current.moved = true;
      if (pressRef.current.longPressTimer) {
        clearTimeout(pressRef.current.longPressTimer);
        pressRef.current.longPressTimer = null;
      }
    }
    if (pressRef.current.moved) {
      setY(clampY(pressRef.current.startY + dy));
    }
  }, [clampY]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const wasDrag = pressRef.current.moved;
    const wasActive = pressRef.current.active;
    pressRef.current.active = false;
    if (pressRef.current.longPressTimer) {
      clearTimeout(pressRef.current.longPressTimer);
      pressRef.current.longPressTimer = null;
    }

    if (wasDrag) {
      try { localStorage.setItem(STORAGE_Y, String(y)); } catch {}
    } else if (wasActive) {
      const elapsed = Date.now() - pressRef.current.startedAt;
      if (elapsed < LONG_PRESS_MS) {
        haptic(6);
        window.dispatchEvent(new CustomEvent("aray:open"));
      }
    }
    try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
  }, [y]);

  const onPointerCancel = useCallback(() => {
    pressRef.current.active = false;
    pressRef.current.moved = false;
    if (pressRef.current.longPressTimer) {
      clearTimeout(pressRef.current.longPressTimer);
      pressRef.current.longPressTimer = null;
    }
  }, []);

  if (!mounted || disabled) return null;

  const floating = (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role="button"
      tabIndex={0}
      aria-label="Арай — короткое нажатие откроет чат, долгое — включит голос"
      className="lg:hidden"
      style={{
        position: "fixed",
        right: EDGE_MARGIN,
        top: y,
        width: WRAP_SIZE,
        height: WRAP_SIZE,
        zIndex: 55, // выше dock (50), ниже drawer (200)
        cursor: pressRef.current.moved ? "grabbing" : "pointer",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: pressRef.current.moved ? "none" : "top 0.25s ease-out",
        filter: "drop-shadow(0 8px 24px hsl(var(--primary) / 0.35)) drop-shadow(0 0 40px hsl(var(--primary) / 0.18))",
      }}
    >
      <ArayOrb
        size={ORB_SIZE}
        id="adm-float"
        pulse={listening ? "listening" : "idle"}
        badge={hasNew}
        intensity="normal"
      />
    </div>
  );

  return createPortal(floating, document.body);
}
