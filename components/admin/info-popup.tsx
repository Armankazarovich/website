"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClassicMode } from "@/lib/use-classic-mode";

// ─── Типы ─────────────────────────────────────────────────────────────────────

type PopupSide = "top" | "bottom" | "auto";

interface InfoPopupProps {
  /** Содержимое попапа — текст или JSX */
  content: React.ReactNode;
  /** Триггер — по умолчанию иконка ℹ */
  children?: React.ReactNode;
  /** Сторона (auto — автоматически по краю экрана) */
  side?: PopupSide;
  /** Ширина попапа в px */
  width?: number;
  /** Выравнивание по горизонтали */
  align?: "center" | "start" | "end";
  className?: string;
  triggerClassName?: string;
}

// ─── Основной компонент ────────────────────────────────────────────────────────

export function InfoPopup({
  content,
  children,
  side = "auto",
  width = 280,
  align = "center",
  className,
  triggerClassName,
}: InfoPopupProps) {
  const [open, setOpen]           = useState(false);
  const [activeSide, setActiveSide] = useState<"top" | "bottom">("top");
  const wrapRef    = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const classic = useClassicMode();

  // ── Авто-определение стороны при открытии ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (side !== "auto") { setActiveSide(side === "bottom" ? "bottom" : "top"); return; }
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    setActiveSide(spaceAbove >= 200 || spaceAbove > spaceBelow ? "top" : "bottom");
  }, [open, side]);

  // ── Закрыть по клику снаружи ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── ESC → закрыть ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Горизонтальное выравнивание ────────────────────────────────────────────
  const alignStyle: React.CSSProperties =
    align === "start"  ? { left: 0, transform: "none" }
    : align === "end"  ? { right: 0, transform: "none" }
    : { left: "50%", transform: "translateX(-50%)" };

  const arrowAlignStyle: React.CSSProperties =
    align === "start"  ? { left: "16px", transform: "none" }
    : align === "end"  ? { right: "16px", left: "auto", transform: "none" }
    : { left: "50%", transform: "translateX(-50%)" };

  return (
    <div ref={wrapRef} className={cn("relative inline-flex items-center", className)}>

      {/* ── Триггер ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Подробнее"
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          open
            ? "bg-primary/25 text-primary scale-110"
            : "text-muted-foreground/60 hover:text-foreground hover:bg-muted hover:scale-110",
          triggerClassName,
        )}
      >
        {children ?? <Info className="w-3.5 h-3.5" />}
      </button>

      {/* ── Попап ── */}
      {open && (
        <div
          className="absolute z-[200] pointer-events-auto"
          style={{
            width: `${width}px`,
            ...alignStyle,
            ...(activeSide === "top"
              ? { bottom: "calc(100% + 12px)" }
              : { top: "calc(100% + 12px)" }
            ),
          }}
        >
          {/* Стрелка */}
          <div
            className="absolute w-3 h-3 rotate-45 bg-card border-border"
            style={{
              ...arrowAlignStyle,
              ...(activeSide === "top"
                ? { bottom: "-6px", borderRight: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }
                : { top: "-6px", borderLeft: "1px solid hsl(var(--border))", borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }
              ),
            }}
          />

          {/* Панель */}
          <div className={`animate-in fade-in-0 zoom-in-95 duration-150 rounded-2xl border border-border bg-card shadow-2xl ${!classic ? "backdrop-blur-xl" : ""}`}>
            <div className="p-4">
              {typeof content === "string" ? (
                <p className="text-sm leading-relaxed text-foreground">{content}</p>
              ) : (
                <div className="text-foreground">{content}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Короткий вариант: только текст ────────────────────────────────────────────

export function InfoBadge({
  text,
  width,
  side,
  align,
  className,
}: {
  text: string;
  width?: number;
  side?: PopupSide;
  align?: "center" | "start" | "end";
  className?: string;
}) {
  return (
    <InfoPopup content={text} width={width} side={side ?? "auto"} align={align} className={className} />
  );
}

// ─── Богатая карточка: заголовок + тело ────────────────────────────────────────

export function InfoCard({
  title,
  body,
  extra,
  width,
  side,
  align,
  className,
}: {
  title: string;
  body: string;
  extra?: React.ReactNode;
  width?: number;
  side?: PopupSide;
  align?: "center" | "start" | "end";
  className?: string;
}) {
  return (
    <InfoPopup
      width={width ?? 300}
      side={side ?? "auto"}
      align={align}
      className={className}
      content={
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          <p className="text-sm leading-relaxed text-foreground/80">{body}</p>
          {extra && <div className="pt-1 border-t border-border">{extra}</div>}
        </div>
      }
    />
  );
}

// ─── Список подсказок внутри попапа ────────────────────────────────────────────

export function InfoList({
  title,
  items,
  width,
  side,
  align,
  className,
}: {
  title?: string;
  items: { label: string; value?: string; color?: string }[];
  width?: number;
  side?: PopupSide;
  align?: "center" | "start" | "end";
  className?: string;
}) {
  return (
    <InfoPopup
      width={width ?? 260}
      side={side ?? "auto"}
      align={align}
      className={className}
      content={
        <div className="space-y-2">
          {title && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          )}
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {item.color && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  )}
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                {item.value && (
                  <span className="text-xs font-medium text-foreground/90 tabular-nums">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
