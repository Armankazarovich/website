import { create } from "zustand";

export type CompareItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription?: string | null;
  description?: string | null;
  images: string[];
  cardTags?: string[] | null;
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  variants: Array<{
    id: string;
    size: string;
    pricePerCube: number | null;
    pricePerPiece: number | null;
    piecesPerCube: number | null;
    inStock: boolean;
  }>;
};

type CompareStore = {
  items: CompareItem[];
  hasHydrated: boolean;
  hydrateCompare: () => void;
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  toggle: (item: CompareItem) => void;
  has: (id: string) => boolean;
  clear: () => void;
  count: () => number;
};

const MAX_COMPARE_ITEMS = 6;
const COMPARE_STORAGE_KEY = "pilorus-compare";

function normalizeCompareItems(value: unknown): CompareItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") return [];
    const item = rawItem as Partial<CompareItem>;
    const saleUnit = item.saleUnit === "PIECE" || item.saleUnit === "BOTH" ? item.saleUnit : "CUBE";
    const variants = Array.isArray(item.variants)
      ? item.variants.flatMap((rawVariant) => {
          if (!rawVariant || typeof rawVariant !== "object") return [];
          const variant = rawVariant as Partial<CompareItem["variants"][number]>;
          if (typeof variant.id !== "string" || typeof variant.size !== "string") return [];
          return [
            {
              id: variant.id,
              size: variant.size,
              pricePerCube: typeof variant.pricePerCube === "number" ? variant.pricePerCube : null,
              pricePerPiece: typeof variant.pricePerPiece === "number" ? variant.pricePerPiece : null,
              piecesPerCube: typeof variant.piecesPerCube === "number" ? variant.piecesPerCube : null,
              inStock: variant.inStock !== false,
            },
          ];
        })
      : [];

    if (
      typeof item.id !== "string" ||
      typeof item.slug !== "string" ||
      typeof item.name !== "string" ||
      typeof item.category !== "string" ||
      variants.length === 0
    ) {
      return [];
    }

    return [
      {
        id: item.id,
        slug: item.slug,
        name: item.name,
        category: item.category,
        shortDescription: typeof item.shortDescription === "string" ? item.shortDescription : null,
        description: typeof item.description === "string" ? item.description : null,
        images: Array.isArray(item.images)
          ? item.images.filter((image): image is string => typeof image === "string")
          : [],
        cardTags: Array.isArray(item.cardTags)
          ? item.cardTags.filter((tag): tag is string => typeof tag === "string")
          : null,
        saleUnit,
        variants,
      },
    ];
  });
}

function readCompareItemsFromStorage(): CompareItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      items?: unknown;
      state?: { items?: unknown };
    };
    return normalizeCompareItems(parsed.state?.items ?? parsed.items);
  } catch {
    return [];
  }
}

function writeCompareItemsToStorage(items: CompareItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      COMPARE_STORAGE_KEY,
      JSON.stringify({ state: { items }, version: 0 }),
    );
  } catch {
    // The in-memory comparison still works if storage is blocked.
  }
}

export const useCompareStore = create<CompareStore>()((set, get) => ({
  items: [],
  hasHydrated: false,
  hydrateCompare: () => {
    if (get().hasHydrated) return;
    set({
      items: readCompareItemsFromStorage(),
      hasHydrated: true,
    });
  },
  add: (item) => {
    const currentItems = get().items;
    if (currentItems.some((existing) => existing.id === item.id)) return;
    const nextItems = [...currentItems, item].slice(-MAX_COMPARE_ITEMS);
    set({ items: nextItems });
    writeCompareItemsToStorage(nextItems);
  },
  remove: (id) => {
    const nextItems = get().items.filter((item) => item.id !== id);
    set({ items: nextItems });
    writeCompareItemsToStorage(nextItems);
  },
  toggle: (item) => {
    const { has, add, remove } = get();
    has(item.id) ? remove(item.id) : add(item);
  },
  has: (id) => get().items.some((item) => item.id === id),
  clear: () => {
    set({ items: [] });
    writeCompareItemsToStorage([]);
  },
  count: () => get().items.length,
}));
