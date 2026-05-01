"use client";

import type { MouseEventHandler } from "react";
import { Check, Eye } from "lucide-react";
import type { AdminAtmosphereItem } from "@/lib/admin-atmospheres";
import { ARAY_FOCUS_RING } from "@/lib/aray-design-tokens";
import type { PaletteItem } from "@/lib/palettes";
import { cn } from "@/lib/utils";

type AdminPaletteCardProps = {
  palette: PaletteItem;
  atmosphere?: AdminAtmosphereItem | null;
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
  atmosphere,
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

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group min-w-0 text-left transition-[background-color,border-color,box-shadow,opacity,transform] duration-200",
        ARAY_FOCUS_RING,
        isLarge ? "rounded-2xl p-2" : "rounded-xl p-1.5",
        active
          ? "border border-primary/65 bg-primary/[0.12] shadow-[0_14px_34px_hsl(var(--primary)/0.16)]"
          : "border border-border/70 bg-background/45 hover:border-primary/35 hover:bg-background/70",
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
          background: `linear-gradient(135deg, ${palette.sidebar}, ${palette.accent})`,
        }}
      >
        {atmosphere?.src && (
          <img
            src={atmosphere.src}
            alt=""
            loading={active ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.58)), linear-gradient(135deg, ${palette.sidebar}44, ${palette.accent}55)`,
          }}
        />
        <span className="absolute inset-x-0 bottom-0 flex h-1.5">
          <span className="flex-1" style={{ background: palette.sidebar }} />
          <span className="flex-1" style={{ background: palette.accent }} />
        </span>
        {active && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10">
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
        <span className={cn("block min-w-0", isLarge ? "mt-2 px-1 pb-0.5" : "mt-1.5")}>
          <span className={cn("block truncate font-semibold leading-tight", isLarge ? "text-sm" : "text-[11px]", active && "text-primary")}>
            {palette.name}
          </span>
          <span className={cn("block truncate font-medium leading-tight text-muted-foreground", isLarge ? "text-[11px]" : "text-[9px]")}>
            {atmosphere?.shortName ?? "ARAY"}
          </span>
        </span>
      )}
    </button>
  );
}
