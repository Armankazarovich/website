"use client";

import type { MouseEvent } from "react";
import { GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompareStore, type CompareItem } from "@/store/compare";

type CompareButtonProps = {
  item: CompareItem;
  size?: "sm" | "md";
  mode?: "floating" | "inline";
  className?: string;
};

export function CompareButton({
  item,
  size = "md",
  mode = "floating",
  className,
}: CompareButtonProps) {
  const { toggle, has } = useCompareStore();
  const isSelected = has(item.id);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(item);
  };

  if (mode === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        className={cn(
          "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
          isSelected
            ? "border-primary/45 bg-primary/[0.12] text-primary hover:bg-primary/[0.16]"
            : "border-border/70 bg-card/70 text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary",
          className
        )}
      >
        <GitCompareArrows className="h-4 w-4" />
        {isSelected ? "В сравнении" : "Сравнить"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isSelected ? "Убрать из сравнения" : "Добавить к сравнению"}
      aria-pressed={isSelected}
      className={cn(
        "group flex items-center justify-center rounded-xl border transition-colors duration-200 active:scale-90",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        isSelected
          ? "border-primary/55 bg-primary/[0.14] text-primary hover:bg-primary/[0.18]"
          : "border-border/70 bg-card/[0.88] text-muted-foreground hover:border-primary/35 hover:bg-card hover:text-primary",
        className
      )}
    >
      <GitCompareArrows
        className={cn(
          "transition-transform duration-200 group-hover:scale-110",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
        )}
      />
    </button>
  );
}
