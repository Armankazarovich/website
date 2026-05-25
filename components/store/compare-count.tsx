"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompareStore } from "@/store/compare";

export function CompareCount({ className }: { className?: string }) {
  const count = useCompareStore((state) => state.items.length);
  const hydrateCompare = useCompareStore((state) => state.hydrateCompare);

  useEffect(() => {
    hydrateCompare();
  }, [hydrateCompare]);

  return (
    <Link
      href="/compare"
      data-compare-icon
      aria-label="Сравнение товаров"
      className={cn("store-header-action flex items-center justify-center", count > 0 && "is-selected", className)}
    >
      <GitCompareArrows className="h-4 w-4" strokeWidth={1.9} />
      {count > 0 && (
        <span className="store-header-action-badge">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
