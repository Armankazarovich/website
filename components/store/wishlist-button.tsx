"use client";

import type { MouseEvent } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlistStore, type WishlistItem } from "@/store/wishlist";

interface WishlistButtonProps {
  item: WishlistItem;
  className?: string;
  size?: "sm" | "md";
  mode?: "floating" | "inline";
}

export function WishlistButton({
  item,
  className = "",
  size = "md",
  mode = "floating",
}: WishlistButtonProps) {
  const { toggle, has } = useWishlistStore();
  const isSaved = has(item.id);

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
        aria-pressed={isSaved}
        className={cn(
          "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
          isSaved
            ? "border-red-500/45 bg-red-500/10 text-red-500 hover:bg-red-500/15"
            : "border-border/70 bg-card/70 text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary",
          className
        )}
      >
        <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
        {isSaved ? "В избранном" : "В избранное"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isSaved ? "Удалить из избранного" : "Добавить в избранное"}
      aria-pressed={isSaved}
      className={cn(
        "group flex items-center justify-center rounded-xl border transition-colors duration-200 active:scale-90",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        isSaved
          ? "border-red-500/45 bg-red-500/12 text-red-500 hover:bg-red-500/16"
          : "border-border/70 bg-card/[0.88] text-muted-foreground hover:border-red-500/30 hover:bg-card hover:text-red-500",
        className
      )}
    >
      <Heart
        className={cn(
          "transition-transform duration-200 group-hover:scale-110",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          isSaved && "fill-current"
        )}
      />
    </button>
  );
}
