"use client";

import type { CSSProperties, MouseEventHandler } from "react";
import { Check, Eye } from "lucide-react";
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
  previewing = false,
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
  const base = isAray ? "#070B12" : palette.sidebar;
  const accent = isAray ? "#0C6C7E" : palette.accent;
  const glow = isAray ? "#D6AE5F" : palette.glow;
  const previewBackground = `radial-gradient(circle at 16% 14%, ${glow}33, transparent 34%), radial-gradient(circle at 88% 78%, ${accent}34, transparent 42%), linear-gradient(135deg, ${base} 0%, ${base} 52%, ${accent} 104%)`;

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
        "admin-palette-button group min-w-0 text-left transition-[background-color,border-color,box-shadow,opacity,transform] duration-200",
        ARAY_FOCUS_RING,
        isLarge ? "rounded-2xl p-2" : "rounded-xl p-1",
        active
          ? "border border-primary/34 bg-primary/[0.055] shadow-[0_8px_18px_hsl(var(--primary)/0.075)]"
          : "border border-border/58 bg-background/30 hover:border-primary/24 hover:bg-background/48",
        !enabled && "opacity-55",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
      style={{
        "--palette-base": base,
        "--palette-accent": accent,
        "--palette-glow": glow,
      } as CSSProperties}
    >
      <span
        className={cn(
          "admin-palette-light relative block overflow-hidden rounded-xl bg-muted ring-1 ring-border/55",
          active && "ring-primary/30",
          isLarge ? "h-20" : "h-10",
        )}
        style={{
          background: previewBackground,
        }}
      >
        <span
          className="absolute inset-0 opacity-90"
          style={{
            background: isAray
              ? "radial-gradient(circle at 28% 18%, rgba(39, 173, 190, 0.24), transparent 42%), radial-gradient(circle at 86% 78%, rgba(214, 174, 95, 0.30), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.28))"
              : `linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.30)), linear-gradient(135deg, ${base}44, ${accent}55)`,
          }}
        />
        <span className="absolute left-2 top-2 h-1 w-7 rounded-full bg-white/16" />
        <span
          className="absolute left-2 top-4 h-px w-12 rounded-full opacity-70"
          style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
        />
        <span
          className="absolute right-2 bottom-2.5 h-px w-14 rounded-full opacity-70"
          style={{ background: `linear-gradient(90deg, transparent, ${glow})` }}
        />
        <span className="absolute inset-x-0 bottom-0 flex h-1">
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
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/86 text-primary shadow-sm ring-1 ring-primary/22 backdrop-blur">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
        {previewing && isLarge && !active && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur" title="Предпросмотр">
            <Eye className="h-3.5 w-3.5" />
          </span>
        )}
      </span>

      {showLabel && (
        <span className={cn("block min-w-0", isLarge ? "mt-2 px-1 pb-0.5" : "mt-1")}>
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
