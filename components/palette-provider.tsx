"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type PaletteItem = {
  id: string;
  name: string;
  sidebar: string;
  accent: string;
};

export const PALETTE_GROUPS: { label: string; palettes: PaletteItem[] }[] = [
  {
    label: "Наши темы",
    palettes: [
      { id: "timber",    name: "Timber (наш)",      sidebar: "#5C3317", accent: "#E8700A" },
      { id: "forest",    name: "Forest",             sidebar: "#1A4D3D", accent: "#2BA88F" },
      { id: "ocean",     name: "Ocean",              sidebar: "#1B3A5C", accent: "#3B82F6" },
      { id: "midnight",  name: "Midnight",           sidebar: "#1A1033", accent: "#8B5CF6" },
      { id: "slate",     name: "Slate",              sidebar: "#1E293B", accent: "#0EA5E9" },
      { id: "crimson",   name: "Crimson",            sidebar: "#3D0C11", accent: "#E8472A" },
    ],
  },
  {
    label: "Цветовые темы",
    palettes: [
      { id: "wildberries", name: "Пурпур",    sidebar: "#1C1230", accent: "#CB11AB" },
      { id: "ozon",        name: "Сапфир",    sidebar: "#001A66", accent: "#005BFF" },
      { id: "yandex",      name: "Уголь",     sidebar: "#1A1A1A", accent: "#FC3F1D" },
      { id: "aliexpress",  name: "Рубин",     sidebar: "#2D0000", accent: "#FF4010" },
      { id: "amazon",      name: "Янтарь",    sidebar: "#232F3E", accent: "#FF9900" },
      { id: "avito",       name: "Лазурь",    sidebar: "#0A3D62", accent: "#00AAFF" },
      { id: "sber",        name: "Малахит",   sidebar: "#052E16", accent: "#21A038" },
    ],
  },
];

export const PALETTES: PaletteItem[] = PALETTE_GROUPS.flatMap((g) => g.palettes);

export type PaletteId = string;

const STORAGE_KEY = "color-palette";
const ALL_IDS = PALETTES.map((p) => p.id);

type PaletteContextType = {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
  enabledIds: string[];
};

const PaletteContext = createContext<PaletteContextType>({
  palette: "timber",
  setPalette: () => {},
  enabledIds: ALL_IDS,
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
}: {
  children: React.ReactNode;
  enabledIds?: string[];
}) {
  const allowed = enabledIds && enabledIds.length > 0 ? enabledIds : ALL_IDS;
  const [palette, setPaletteState] = useState<PaletteId>("timber");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && PALETTES.find((p) => p.id === stored) && allowed.includes(stored)) {
      setPaletteState(stored);
      applyPalette(stored);
    }
  }, []);

  const setPalette = (id: PaletteId) => {
    if (!allowed.includes(id)) return;
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
