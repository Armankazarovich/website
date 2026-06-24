"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchDrawer } from "@/store/search-drawer";

export function PriceListSearchAction({
  className,
  label = "Поиск по каталогу",
}: {
  className?: string;
  label?: string;
}) {
  const { toggle } = useSearchDrawer();

  return (
    <button
      type="button"
      data-price-list-search-action
      onClick={toggle}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary",
        className,
      )}
      aria-label={label}
    >
      <Search className="h-4 w-4 text-primary" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
