export type PaletteItem = {
  id: string;
  name: string;
  sidebar: string;
  accent: string;
};

export const PALETTE_GROUPS: { label: string; palettes: PaletteItem[] }[] = [
  {
    label: "ARAY Core",
    palettes: [
      { id: "timber", name: "Timber", sidebar: "#5C3317", accent: "#E8700A" },
      { id: "forest", name: "Forest", sidebar: "#1A4D3D", accent: "#2BA88F" },
      { id: "ocean", name: "Ocean", sidebar: "#1B3A5C", accent: "#3B82F6" },
      { id: "midnight", name: "Midnight", sidebar: "#1A1033", accent: "#8B5CF6" },
      { id: "slate", name: "Slate", sidebar: "#243142", accent: "#0EA5E9" },
      { id: "crimson", name: "Crimson", sidebar: "#3D0C11", accent: "#E8472A" },
    ],
  },
  {
    label: "Business Moods",
    palettes: [
      { id: "sber", name: "ARAY", sidebar: "#101827", accent: "#D8A84E" },
      { id: "avito", name: "Market", sidebar: "#123B63", accent: "#00AAFF" },
      { id: "amazon", name: "Commerce", sidebar: "#263545", accent: "#FFB000" },
    ],
  },
];

export const PALETTES: PaletteItem[] = PALETTE_GROUPS.flatMap((group) => group.palettes);
export const ALL_PALETTE_IDS = PALETTES.map((palette) => palette.id);

const PALETTE_ID_SET = new Set(ALL_PALETTE_IDS);

export function isPaletteId(id: string): boolean {
  return PALETTE_ID_SET.has(id);
}

export function normalizePaletteId(id: string | null | undefined, fallback = "timber"): string {
  return id && isPaletteId(id) ? id : fallback;
}

export function normalizePaletteIds(raw: string | string[] | null | undefined): string[] {
  const ids = Array.isArray(raw)
    ? raw
    : (raw || "").split(",");
  const normalized = ids.map((id) => id.trim()).filter(isPaletteId);
  return normalized.length > 0 ? normalized : ALL_PALETTE_IDS;
}
