export type PaletteItem = {
  id: string;
  name: string;
  sidebar: string;
  accent: string;
  glow: string;
  mood: string;
  pairing: string;
};

export const PALETTE_GROUPS: { label: string; palettes: PaletteItem[] }[] = [
  {
    label: "ARAY Core",
    palettes: [
      { id: "timber", name: "Timber", sidebar: "#4A2A17", accent: "#D86F22", glow: "#E2B86A", mood: "Earth", pairing: "Soil + copper + warm gold" },
      { id: "forest", name: "Forest", sidebar: "#10372D", accent: "#24A58B", glow: "#B6D97A", mood: "Forest", pairing: "Pine + mist + young light" },
      { id: "ocean", name: "Ocean", sidebar: "#112C4D", accent: "#3C8CFF", glow: "#7DE2F2", mood: "Water", pairing: "Deep sea + sky + foam" },
      { id: "midnight", name: "Midnight", sidebar: "#171026", accent: "#8D6BFF", glow: "#D2B7FF", mood: "Focus", pairing: "Night ink + violet + moon glass" },
      { id: "slate", name: "Slate", sidebar: "#1B2530", accent: "#4CA6D9", glow: "#B9D2DF", mood: "North", pairing: "Graphite + ice + steel light" },
      { id: "crimson", name: "Crimson", sidebar: "#321116", accent: "#E65E4A", glow: "#F2A093", mood: "Impulse", pairing: "Wine + ember + rose metal" },
    ],
  },
  {
    label: "Business Moods",
    palettes: [
      { id: "sber", name: "ARAY", sidebar: "#070C13", accent: "#22A7B7", glow: "#D6AE5F", mood: "ARAY", pairing: "Graphite + water intelligence + gold" },
      { id: "avito", name: "Market", sidebar: "#102B48", accent: "#19AFFF", glow: "#5BE6C8", mood: "City", pairing: "City blue + electric cyan + fresh signal" },
      { id: "amazon", name: "Commerce", sidebar: "#172333", accent: "#F2B233", glow: "#5D8CFF", mood: "Cosmos", pairing: "Space navy + commerce gold + data blue" },
    ],
  },
];

export const PALETTES: PaletteItem[] = PALETTE_GROUPS.flatMap((group) => group.palettes);
export const ALL_PALETTE_IDS = PALETTES.map((palette) => palette.id);
export const PILORUS_BRAND_PALETTE_ID = "timber";
export const ADMIN_PALETTE_STORAGE_KEY = "admin-color-palette";
export const LEGACY_PALETTE_STORAGE_KEY = "color-palette";

const PALETTE_ID_SET = new Set(ALL_PALETTE_IDS);

export function isPaletteId(id: string): boolean {
  return PALETTE_ID_SET.has(id);
}

export function normalizePaletteId(id: string | null | undefined, fallback = "sber"): string {
  return id && isPaletteId(id) ? id : fallback;
}

export function normalizePaletteIds(raw: string | string[] | null | undefined): string[] {
  const ids = Array.isArray(raw)
    ? raw
    : (raw || "").split(",");
  const normalized = ids.map((id) => id.trim()).filter(isPaletteId);
  const result = normalized.length > 0 ? normalized : ALL_PALETTE_IDS;
  return result.includes("sber") ? result : ["sber", ...result];
}
