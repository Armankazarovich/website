"use client";

import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompareStore } from "@/store/compare";

export function CompareCount({ className }: { className?: string }) {
  const count = useCompareStore((state) => state.items.length);

  return (
    <Link
      href="/compare"
      aria-label="Сравнение товаров"
      className={cn(
        count > 0
          ? "relative flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary transition-all duration-200 hover:bg-primary/[0.15]"
          : "relative flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground transition-all duration-200 hover:border-border hover:bg-accent hover:text-foreground",
        className
      )}
    >
      <GitCompareArrows className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
