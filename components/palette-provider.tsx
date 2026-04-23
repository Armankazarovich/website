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
    label: "ARAY Palettes",
    palettes: [
      { id: "timber",    name: "Timber",    sidebar: "#5C3317", accent: "#E8700A" },
      { id: "forest",    name: "Forest",    sidebar: "#1A4D3D", accent: "#2BA88F" },
      { id: "ocean",     name: "Ocean",     sidebar: "#1B3A5C", accent: "#3B82F6" },
      { id: "midnight",  name: "Midnight",  sidebar: "#1A1033", accent: "#8B5CF6" },
      { id: "crimson",   name: "Crimson",   sidebar: "#3D0C11", accent: "#E8472A" },
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
  defaultPalette = "timber",
}: {
  children: React.ReactNode;
  enabledIds?: string[];
  defaultPalette?: string;
}) {
  const allowed = enabledIds && enabledIds.length > 0 ? enabledIds : ALL_IDS;
  const [palette, setPaletteState] = useState<PaletteId>(defaultPalette || "timber");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Если есть сохранённая палитра (любая валидная) — всегда применяем
    // Ограничение по allowed действует только в UI выбора (для клиентов),
    // а не при восстановлении предпочтения пользователя
    if (stored && PALETTES.find((p) => p.id === stored)) {
      setPaletteState(stored);
      applyPalette(stored);
    } else {
      // Нет сохранённого — применяем дефолт из настроек админки
      const def = defaultPalette || "timber";
      setPaletteState(def);
      applyPalette(def);
    }
  }, []);

  const setPalette = (id: PaletteId) => {
    // Allow any valid palette (allowed restriction is for customer picker UI only)
    if (!PALETTES.find((p) => p.id === id)) return;
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
