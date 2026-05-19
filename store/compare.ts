import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  toggle: (item: CompareItem) => void;
  has: (id: string) => boolean;
  clear: () => void;
  count: () => number;
};

const MAX_COMPARE_ITEMS = 6;

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((state) => {
          if (state.items.some((existing) => existing.id === item.id)) return state;
          const next = [...state.items, item].slice(-MAX_COMPARE_ITEMS);
          return { items: next };
        }),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      toggle: (item) => {
        const { has, add, remove } = get();
        has(item.id) ? remove(item.id) : add(item);
      },
      has: (id) => get().items.some((item) => item.id === id),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: "pilorus-compare" }
  )
);

