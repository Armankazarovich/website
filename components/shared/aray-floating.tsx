"use client";

/**
 * ArayFloating — Парящий Живой Арай на правом краю экрана
 *
 * Видение Армана: Арай — не часть навигации, а отдельная сущность.
 * Свободно парит сбоку, перетаскиваемый вверх-вниз по правому краю.
 *
 * Взаимодействия:
 *   • Short tap (<350ms)       → открыть chat panel
 *   • Long press (≥500ms)       → показать palette popup (без перехода в меню)
 *   • Vertical drag             → перемещение по правому краю, Y сохраняется в localStorage
 *
 * Состояния существа (Canvas/WebGL через ArayCreature):
 *   • idle       — default когда панель/popup закрыты
 *   • thinking   — когда пользователь жмёт (будет интегрировано с AI позже)
 *   • listening  — mic/voice (зарезервировано)
 *   • speaking   — при выводе ответа (зарезервировано)
 *
 * Совместимо с SSR (Portal в body, dynamic three import внутри ArayCreature).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArayCreature, type CreatureState } from "@/components/shared/aray-creature";
import { ArayChatPanel } from "@/components/store/aray-chat-panel";
import { usePalette, PALETTE_GROUPS } from "@/components/palette-provider";

const STORAGE_Y = "aray-floating-y";
const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 8;
const EDGE_MARGIN = 12;

function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const ms = style === "heavy" ? 30 : style === "medium" ? 15 : 8;
  try { navigator.vibrate(ms); } catch {}
}

interface ArayFloatingProps {
  productName?: string | null;
  productContext?: string | null;
  userName?: string | null;
  /** Скрыть на определённых страницах (например, в чекауте) */
  hidden?: boolean;
  /** Размер существа. По умолчанию 72 на десктопе, 60 на мобилке */
  size?: number;
}

export function ArayFloating({
  productName,
  productContext,
  userName,
  hidden = false,
  size,
}: ArayFloatingProps) {
  const [mounted, setMounted] = useState(false);
  const [y, setY] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [state, setState] = useState<CreatureState>("idle");
  const [isMobile, setIsMobile] = useState(false);

  // pointer tracking
  const pressRef = useRef({
    active: false,
    startY: 0,
    startPointerY: 0,
    moved: false,
    pointerId: 0 as number,
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    startedAt: 0,
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Init mount + load saved Y + detect mobile
  useEffect(() => {
    setMounted(true);
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    const saved = parseInt(localStorage.getItem(STORAGE_Y) || "", 10);
    const defaultY = Math.max(120, window.innerHeight * 0.5);
    const initial = Number.isFinite(saved) ? clampY(saved, window.innerHeight, mobile) : defaultY;
    setY(initial);

    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setY((prev) => clampY(prev, window.innerHeight, window.innerWidth < 768));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Helpers
  const creatureSize = size ?? (isMobile ? 60 : 72);
  const wrapperSize = creatureSize + 8; // touch padding

  function clampY(val: number, vh: number, mobile: boolean) {
    const bottomGuard = mobile ? 90 : 24; // avoid mobile bottom-nav
    return Math.max(60, Math.min(val, vh - wrapperSize - bottomGuard));
  }

  // ── Pointer handlers ──────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (chatOpen || paletteOpen) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pressRef.current.active = true;
    pressRef.current.startY = y;
    pressRef.current.startPointerY = e.clientY;
    pressRef.current.moved = false;
    pressRef.current.pointerId = e.pointerId;
    pressRef.current.startedAt = Date.now();

    // Long press timer
    pressRef.current.longPressTimer = setTimeout(() => {
      if (pressRef.current.active && !pressRef.current.moved) {
        haptic("medium");
        setPaletteOpen(true);
        pressRef.current.active = false;
      }
    }, LONG_PRESS_MS);

    setState("thinking"); // visual feedback on press
  }, [chatOpen, paletteOpen, y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pressRef.current.active) return;
    const dy = e.clientY - pressRef.current.startPointerY;

    if (!pressRef.current.moved && Math.abs(dy) > DRAG_THRESHOLD_PX) {
      pressRef.current.moved = true;
      // cancel long press — this is a drag now
      if (pressRef.current.longPressTimer) {
        clearTimeout(pressRef.current.longPressTimer);
        pressRef.current.longPressTimer = null;
      }
    }

    if (pressRef.current.moved) {
      const newY = clampY(pressRef.current.startY + dy, window.innerHeight, isMobile);
      setY(newY);
    }
  }, [isMobile]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!pressRef.current.active && !pressRef.current.moved) {
      // already handled (long press fired)
      setState("idle");
      return;
    }
    pressRef.current.active = false;
    if (pressRef.current.longPressTimer) {
      clearTimeout(pressRef.current.longPressTimer);
      pressRef.current.longPressTimer = null;
    }

    const elapsed = Date.now() - pressRef.current.startedAt;
    const wasDrag = pressRef.current.moved;

    if (wasDrag) {
      localStorage.setItem(STORAGE_Y, String(y));
    } else if (elapsed < LONG_PRESS_MS) {
      // Short tap → open chat
      haptic("light");
      setChatOpen(true);
    }

    setState("idle");
    try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
  }, [y]);

  const onPointerCancel = useCallback(() => {
    pressRef.current.active = false;
    pressRef.current.moved = false;
    if (pressRef.current.longPressTimer) {
      clearTimeout(pressRef.current.longPressTimer);
      pressRef.current.longPressTimer = null;
    }
    setState("idle");
  }, []);

  // Keyboard accessibility: Enter/Space → chat, Shift+Enter → palette
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (chatOpen || paletteOpen) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.shiftKey) setPaletteOpen(true);
      else setChatOpen(true);
    }
  };

  if (!mounted || hidden) return null;

  const creatureState: CreatureState = chatOpen ? "speaking" : paletteOpen ? "listening" : state;

  const floating = (
    <>
      {/* ─── Floating creature ──────────────────────────────────────── */}
      <div
        ref={wrapperRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Арай — живой ассистент. Короткое нажатие — открыть чат, долгое — оформление."
        style={{
          position: "fixed",
          right: EDGE_MARGIN,
          top: y,
          width: wrapperSize,
          height: wrapperSize,
          zIndex: 80,
          cursor: pressRef.current.moved ? "grabbing" : "pointer",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: pressRef.current.moved ? "none" : "top 0.25s ease-out",
          filter: `drop-shadow(0 8px 24px hsl(var(--brand-primary) / 0.35)) drop-shadow(0 0 40px hsl(var(--brand-primary) / 0.2))`,
        }}
      >
        <ArayCreature size={creatureSize} state={creatureState} intensity={paletteOpen || chatOpen ? 1.25 : 1} />
      </div>

      {/* ─── Palette popup (long press) ────────────────────────────── */}
      <AnimatePresence>
        {paletteOpen && <PalettePopup onClose={() => setPaletteOpen(false)} anchorY={y + creatureSize / 2} />}
      </AnimatePresence>

      {/* ─── Chat panel (tap) ──────────────────────────────────────── */}
      <ArayChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        productName={productName}
        productContext={productContext}
        userName={userName}
      />
    </>
  );

  return createPortal(floating, document.body);
}

// ── Palette popup component ────────────────────────────────────────────
function PalettePopup({ onClose, anchorY }: { onClose: () => void; anchorY: number }) {
  const { palette, setPalette, enabledIds } = usePalette();
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC to close + click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => document.addEventListener("mousedown", onClick), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  const panelTop = Math.max(60, Math.min(anchorY - 120, (typeof window !== "undefined" ? window.innerHeight : 800) - 480));

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: 40, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.92 }}
      transition={{ type: "spring", damping: 24, stiffness: 300 }}
      style={{
        position: "fixed",
        right: 100,
        top: panelTop,
        width: 280,
        maxHeight: "70vh",
        zIndex: 85,
        overflow: "hidden",
      }}
      className="glass-popup rounded-2xl shadow-2xl p-4"
      role="dialog"
      aria-label="Выбор оформления"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-foreground">Оформление</div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Закрыть"
        >Готово</button>
      </div>

      <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
        {PALETTE_GROUPS.map((group) => {
          const items = group.palettes.filter((p) => enabledIds.includes(p.id));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                {group.label}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {items.map((p) => {
                  const isActive = p.id === palette;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setPalette(p.id); haptic("light"); }}
                      className={`
                        relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all
                        ${isActive
                          ? "border-2 border-primary bg-primary/15"
                          : "border-2 border-border hover:border-primary/40"}
                      `}
                      aria-label={p.name}
                      aria-pressed={isActive}
                    >
                      <div
                        className="w-8 h-8 rounded-full ring-1 ring-white/10"
                        style={{
                          background: `linear-gradient(135deg, ${p.sidebar}, ${p.accent})`,
                        }}
                      />
                      <div className="text-[10px] text-foreground truncate max-w-full">{p.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
