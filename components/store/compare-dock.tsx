"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import { useCompareStore } from "@/store/compare";

export function CompareDock() {
  const pathname = usePathname();
  const count = useCompareStore((state) => state.items.length);
  const hydrateCompare = useCompareStore((state) => state.hydrateCompare);

  useEffect(() => {
    hydrateCompare();
  }, [hydrateCompare]);

  if (count === 0 || pathname === "/compare") return null;

  return (
    <div
      className="fixed inset-x-3 z-[48] sm:hidden"
      style={{ bottom: "calc(5.15rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Link
        href="/compare"
        className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-card/[0.96] px-4 py-3 text-foreground"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.12] text-primary">
            <GitCompareArrows className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Сравнение товаров</span>
            <span className="block truncate text-xs text-muted-foreground">
              {count} товар{count === 1 ? "" : count < 5 ? "а" : "ов"} в списке
            </span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      </Link>
    </div>
  );
}
