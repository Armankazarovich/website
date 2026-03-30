"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const PALETTES = [
  {
    id: "timber",
    name: "Timber",
    sidebar: "#5C3317",
    accent: "#E8700A",
  },
  {
    id: "forest",
    name: "Forest",
    sidebar: "#1A4D3D",
    accent: "#2BA88F",
  },
  {
    id: "ocean",
    name: "Ocean",
    sidebar: "#1B3A5C",
    accent: "#3B82F6",
  },
  {
    id: "midnight",
    name: "Midnight",
    sidebar: "#1A1033",
    accent: "#8B5CF6",
  },
  {
    id: "slate",
    name: "Slate",
    sidebar: "#1E293B",
    accent: "#0EA5E9",
  },
  {
    id: "crimson",
    name: "Crimson",
    sidebar: "#3D0C11",
    accent: "#E8472A",
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

const STORAGE_KEY = "color-palette";

type PaletteContextType = {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
};

const PaletteContext = createContext<PaletteContextType>({
  palette: "timber",
  setPalette: () => {},
});

function applyPalette(id: PaletteId) {
  const root = document.documentElement;
  if (id === "timber") {
    root.removeAttribute("data-palette");
  } else {
    root.setAttribute("data-palette", id);
  }
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>("timber");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as PaletteId | null;
    if (stored && PALETTES.find((p) => p.id === stored)) {
      setPaletteState(stored);
      applyPalette(stored);
    }
  }, []);

  const setPalette = (id: PaletteId) => {
    setPaletteState(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyPalette(id);
  };

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  return useContext(PaletteContext);
}
