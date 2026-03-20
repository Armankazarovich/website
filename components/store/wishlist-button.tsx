"use client";

import { Heart } from "lucide-react";
import { useWishlistStore, WishlistItem } from "@/store/wishlist";

interface WishlistButtonProps {
  item: WishlistItem;
  className?: string;
  size?: "sm" | "md";
}

export function WishlistButton({ item, className = "", size = "md" }: WishlistButtonProps) {
  const { toggle, has } = useWishlistStore();
  const isSaved = has(item.id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      aria-label={isSaved ? "Удалить из избранного" : "Добавить в избранное"}
      className={`group flex items-center justify-center rounded-xl transition-all duration-200 ${
        size === "sm" ? "w-8 h-8" : "w-9 h-9"
      } ${
        isSaved
          ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 hover:bg-red-100"
          : "bg-card border border-border hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
      } ${className}`}
    >
      <Heart
        className={`transition-all duration-200 ${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} ${
          isSaved
            ? "fill-red-500 text-red-500 scale-110"
            : "text-muted-foreground group-hover:text-red-400 group-hover:scale-110"
        }`}
      />
    </button>
  );
}
