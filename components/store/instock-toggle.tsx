"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface InstockToggleProps {
  active: boolean;
}

export function InstockToggle({ active }: InstockToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete("instock");
    } else {
      params.set("instock", "1");
      params.delete("page"); // reset pagination
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
      )}
    >
      <span className={cn(
        "w-2 h-2 rounded-full transition-colors",
        active ? "bg-white animate-pulse" : "bg-muted-foreground/40"
      )} />
      В наличии
    </button>
  );
}
