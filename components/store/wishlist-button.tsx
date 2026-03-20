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
      className={`group flex items-center justify-center rounded-xl transition-all duration-200 backdrop-blur-sm ${
        size === "sm" ? "w-7 h-7" : "w-9 h-9"
      } ${
        isSaved
          ? "bg-red-500/90 border border-red-400/50 hover:bg-red-500"
          : "bg-black/30 border border-white/20 hover:bg-black/50"
      } ${className}`}
    >
      <Heart
        className={`transition-all duration-200 ${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} ${
          isSaved
            ? "fill-white text-white scale-110"
            : "text-white group-hover:text-white group-hover:scale-110"
        }`}
      />
    </button>
  );
}
