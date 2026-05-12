"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ADMIN_PALETTE_STORAGE_KEY,
  LEGACY_PALETTE_STORAGE_KEY,
  PILORUS_BRAND_PALETTE_ID,
  isPaletteId,
  normalizePaletteId,
  normalizePaletteIds,
} from "@/lib/palettes";

export type PaletteId = string;
export type { PaletteItem } from "@/lib/palettes";
export { PALETTE_GROUPS, PALETTES } from "@/lib/palettes";

type PaletteContextType = {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
  enabledIds: string[];
  editable: boolean;
};

const PaletteContext = createContext<PaletteContextType>({
  palette: PILORUS_BRAND_PALETTE_ID,
  setPalette: () => {},
  enabledIds: [PILORUS_BRAND_PALETTE_ID],
  editable: false,
});

function applyPalette(id: PaletteId) {
  const root = document.documentElement;
  if (id === "timber") {
    root.removeAttribute("data-palette");
  } else {
    root.setAttribute("data-palette", id);
  }
}

export function PaletteProvider({
  children,
  enabledIds,
  defaultPalette = "sber",
}: {
  children: React.ReactNode;
  enabledIds?: string[];
  defaultPalette?: string;
}) {
  const pathname = usePathname();
  const editable = (pathname?.startsWith("/admin") || pathname?.startsWith("/cabinet")) ?? false;
  const allowed = normalizePaletteIds(enabledIds);
  const safeDefaultPalette = normalizePaletteId(defaultPalette, "sber");
  const [palette, setPaletteState] = useState<PaletteId>(
    editable ? safeDefaultPalette : PILORUS_BRAND_PALETTE_ID
  );

  useEffect(() => {
    if (!editable) {
      setPaletteState(PILORUS_BRAND_PALETTE_ID);
      applyPalette(PILORUS_BRAND_PALETTE_ID);
      return;
    }

    const stored = localStorage.getItem(ADMIN_PALETTE_STORAGE_KEY);
    const legacyStored = localStorage.getItem(LEGACY_PALETTE_STORAGE_KEY);
    if (!stored && legacyStored && isPaletteId(legacyStored)) {
      localStorage.setItem(ADMIN_PALETTE_STORAGE_KEY, legacyStored);
    }

    const nextStored = stored || legacyStored;
    const next = nextStored && isPaletteId(nextStored) ? nextStored : safeDefaultPalette;
    if (stored && !isPaletteId(stored)) {
      localStorage.removeItem(ADMIN_PALETTE_STORAGE_KEY);
    }
    setPaletteState(next);
    applyPalette(next);
  }, [editable, safeDefaultPalette]);

  const setPalette = (id: PaletteId) => {
    if (!editable) return;
    if (!isPaletteId(id)) return;
    setPaletteState(id);
    localStorage.setItem(ADMIN_PALETTE_STORAGE_KEY, id);
    applyPalette(id);
  };

  return (
    <PaletteContext.Provider
      value={{
        palette,
        setPalette,
        enabledIds: editable ? allowed : [PILORUS_BRAND_PALETTE_ID],
        editable,
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  return useContext(PaletteContext);
}
