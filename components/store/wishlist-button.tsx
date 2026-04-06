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
      className={`group flex items-center justify-center rounded-xl transition-all duration-200 backdrop-blur-sm active:scale-90 ${
        size === "sm" ? "w-7 h-7" : "w-9 h-9"
      } ${
        isSaved
          ? "bg-red-500 border border-red-400/60 hover:bg-red-600 shadow-md shadow-red-500/30"
          : "bg-black/45 border border-white/25 hover:bg-black/65 hover:border-white/40 shadow-sm"
      } ${className}`}
    >
      <Heart
        className={`transition-all duration-200 drop-shadow-sm ${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} ${
          isSaved
            ? "fill-white text-white scale-110"
            : "text-white/90 group-hover:text-white group-hover:scale-110"
        }`}
      />
    </button>
  );
}
