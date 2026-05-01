"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  ALL_PALETTE_IDS,
  isPaletteId,
  normalizePaletteId,
  normalizePaletteIds,
} from "@/lib/palettes";

export type PaletteId = string;
export type { PaletteItem } from "@/lib/palettes";
export { PALETTE_GROUPS, PALETTES } from "@/lib/palettes";

const STORAGE_KEY = "color-palette";

type PaletteContextType = {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
  enabledIds: string[];
};

const PaletteContext = createContext<PaletteContextType>({
  palette: "sber",
  setPalette: () => {},
  enabledIds: ALL_PALETTE_IDS,
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
  const allowed = normalizePaletteIds(enabledIds);
  const safeDefaultPalette = normalizePaletteId(defaultPalette, "sber");
  const [palette, setPaletteState] = useState<PaletteId>(safeDefaultPalette);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const next = stored && isPaletteId(stored) ? stored : safeDefaultPalette;
    if (stored && !isPaletteId(stored)) {
      localStorage.removeItem(STORAGE_KEY);
    }
    setPaletteState(next);
    applyPalette(next);
  }, [safeDefaultPalette]);

  const setPalette = (id: PaletteId) => {
    if (!isPaletteId(id)) return;
    setPaletteState(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyPalette(id);
  };

  return (
    <PaletteContext.Provider value={{ palette, setPalette, enabledIds: allowed }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  return useContext(PaletteContext);
}
