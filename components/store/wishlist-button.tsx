"use client";

import { useEffect, useState, type MouseEvent } from "react";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isSaved = mounted && has(item.id);

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
          "store-action-button store-action-button-inline",
          isSaved && "is-selected",
          className
        )}
      >
        <Heart className={cn("h-4 w-4 store-wishlist-heart", isSaved && "is-active")} strokeWidth={1.9} fill={isSaved ? "currentColor" : "none"} />
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
        "store-action-button store-action-button-floating",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        isSaved && "is-selected",
        className
      )}
    >
      <Heart
        className={cn(
          "store-wishlist-heart transition-colors duration-200",
          size === "sm" ? "h-4 w-4" : "h-4 w-4",
          isSaved && "is-active",
        )}
        strokeWidth={2.15}
        fill={isSaved ? "currentColor" : "none"}
      />
    </button>
  );
}
