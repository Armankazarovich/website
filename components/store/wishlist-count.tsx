"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist";

export function WishlistCount() {
  const count = useWishlistStore((s) => s.items.length);
  const hydrateWishlist = useWishlistStore((s) => s.hydrateWishlist);

  useEffect(() => {
    hydrateWishlist();
  }, [hydrateWishlist]);

  return (
    <Link
      href="/wishlist"
      aria-label="Избранное"
      className={cn("store-header-action flex items-center justify-center", count > 0 && "is-selected")}
    >
      <Heart className="w-4 h-4" strokeWidth={1.9} />
      {count > 0 && (
        <span className="store-header-action-badge">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
