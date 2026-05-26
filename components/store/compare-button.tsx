"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Check, GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompareStore, type CompareItem } from "@/store/compare";
import { flyToCompare } from "@/lib/cart-fly";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isSelected = mounted && has(item.id);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isSelected) flyToCompare(event.currentTarget);
    toggle(item);
  };

  if (mode === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        data-store-compare-action
        className={cn(
          "store-action-button store-action-button-inline",
          isSelected && "is-selected",
          className
        )}
      >
        <GitCompareArrows className="h-4 w-4" strokeWidth={1.9} />
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
      data-store-compare-action
      className={cn(
        "store-action-button store-action-button-floating",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        isSelected && "is-selected",
        className
      )}
    >
      <GitCompareArrows
        className={cn(
          "transition-colors duration-200",
          size === "sm" ? "h-4 w-4" : "h-4 w-4"
        )}
        strokeWidth={2.15}
      />
      {isSelected && (
        <span className="store-action-checkmark" aria-hidden="true">
          <Check className="h-2.5 w-2.5" strokeWidth={2.4} />
        </span>
      )}
    </button>
  );
}
