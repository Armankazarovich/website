"use client";

import type { MouseEventHandler } from "react";
import { Check } from "lucide-react";
import { ARAY_FOCUS_RING } from "@/lib/aray-design-tokens";
import type { PaletteItem } from "@/lib/palettes";
import { cn } from "@/lib/utils";

type AdminPaletteCardProps = {
  palette: PaletteItem;
  active?: boolean;
  enabled?: boolean;
  previewing?: boolean;
  variant?: "compact" | "large";
  showLabel?: boolean;
  className?: string;
  title?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>;
};

export function AdminPaletteCard({
  palette,
  active = false,
  enabled = true,
  variant = "compact",
  showLabel = true,
  className,
  title,
  disabled,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: AdminPaletteCardProps) {
  const isLarge = variant === "large";
  const isAray = palette.id === "sber";
  const previewBackground = isAray
    ? "linear-gradient(135deg, #070B12 0%, #111A25 45%, #0C2B37 72%, #D6AE5F 100%)"
    : `radial-gradient(circle at 20% 18%, ${palette.glow}55, transparent 42%), linear-gradient(135deg, ${palette.sidebar} 0%, ${palette.sidebar} 42%, ${palette.accent} 78%, ${palette.glow} 100%)`;

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group min-w-0 text-left transition-[background-color,border-color,box-shadow,opacity,transform] duration-200",
        ARAY_FOCUS_RING,
        isLarge ? "rounded-2xl p-2" : "rounded-xl p-1.5",
        active
          ? "border border-primary/55 bg-primary/[0.12]"
          : "border border-border/70 bg-background/50 hover:border-primary/40 hover:bg-background/70",
        !enabled && "opacity-55",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <span
        className={cn(
          "relative block overflow-hidden rounded-xl bg-muted ring-1 ring-border/55",
          isLarge ? "h-28" : "h-16",
        )}
        style={{
          background: previewBackground,
        }}
      >
        <span
          className="absolute inset-0"
          style={{
            background: isAray
              ? "radial-gradient(circle at 20% 20%, rgba(39, 173, 190, 0.24), transparent 42%), radial-gradient(circle at 86% 78%, rgba(214, 174, 95, 0.32), transparent 38%), linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.58))"
              : `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.58)), linear-gradient(135deg, ${palette.sidebar}44, ${palette.accent}55)`,
          }}
        />
        <span className="absolute inset-x-0 bottom-0 flex h-1.5">
          {isAray ? (
            <>
              <span className="flex-1" style={{ background: "#070B12" }} />
              <span className="flex-1" style={{ background: "#0C6C7E" }} />
              <span className="flex-1" style={{ background: "#D6AE5F" }} />
            </>
          ) : (
            <>
              <span className="flex-1" style={{ background: palette.sidebar }} />
              <span className="flex-1" style={{ background: palette.accent }} />
              <span className="flex-1" style={{ background: palette.glow }} />
            </>
          )}
        </span>
        {active && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black ring-1 ring-black/10">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </span>

      {showLabel && (
        <span className={cn("block min-w-0", isLarge ? "mt-2 px-1 pb-0.5" : "mt-1.5")}>
          <span className={cn("block truncate font-semibold leading-tight", isLarge ? "text-sm" : "text-[11px]", active && "text-primary")}>
            {palette.name}
          </span>
          <span className={cn("block truncate font-medium leading-tight text-muted-foreground", isLarge ? "text-[11px]" : "text-[9px]")}>
            {palette.mood}
          </span>
        </span>
      )}
    </button>
  );
}
