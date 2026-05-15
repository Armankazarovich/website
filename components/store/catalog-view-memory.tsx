"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CatalogView = "auto" | "list" | "2" | "3" | "4" | "5";

const STORAGE_KEY = "pilorus.catalog.view";
const VALID_VIEWS = new Set<CatalogView>(["auto", "list", "2", "3", "4", "5"]);

interface CatalogViewMemoryProps {
  currentView: CatalogView;
  hasViewParam: boolean;
}

export function CatalogViewMemory({ currentView, hasViewParam }: CatalogViewMemoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawView = searchParams.get("view");

    if (hasViewParam) {
      if (VALID_VIEWS.has(currentView)) {
        window.localStorage.setItem(STORAGE_KEY, currentView);
      }

      if (rawView === "auto") {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("view");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }
      return;
    }

    const savedView = window.localStorage.getItem(STORAGE_KEY) as CatalogView | null;
    if (!savedView || savedView === "auto" || !VALID_VIEWS.has(savedView)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", savedView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentView, hasViewParam, pathname, router, searchParams]);

  return null;
}
