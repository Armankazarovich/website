"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist";

export function WishlistCount() {
  const count = useWishlistStore((s) => s.items.length);

  return (
    <Link
      href="/wishlist"
      aria-label="Избранное"
      className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-accent transition-colors"
    >
      <Heart className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
