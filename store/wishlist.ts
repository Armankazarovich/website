import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishlistItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  images: string[];
  saleUnit: string;
  variants: Array<{
    id: string;
    size: string;
    pricePerCube: number | null;
    pricePerPiece: number | null;
    piecesPerCube: number | null;
    inStock: boolean;
  }>;
};

type WishlistStore = {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  clear: () => void;
  count: () => number;
};

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => set((s) => ({
        items: s.items.some((i) => i.id === item.id) ? s.items : [...s.items, item],
      })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      toggle: (item) => {
        const { has, add, remove } = get();
        has(item.id) ? remove(item.id) : add(item);
      },
      has: (id) => get().items.some((i) => i.id === id),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: "pilorus-wishlist" }
  )
);
