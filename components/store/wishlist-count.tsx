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
      className={
        count > 0
          ? "relative flex items-center justify-center w-9 h-9 rounded-xl border border-red-400/40 bg-red-500/8 text-red-500 hover:bg-red-500/15 transition-all duration-200"
          : "relative flex items-center justify-center w-9 h-9 rounded-xl border border-border/60 bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border transition-all duration-200"
      }
    >
      <Heart className={`w-4 h-4 transition-all ${count > 0 ? "fill-red-500/20" : ""}`} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm shadow-red-500/30">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
