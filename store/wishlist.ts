import { create } from "zustand";

export type WishlistItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
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
    stockQty?: number | null;
    lowStockThreshold?: number | null;
  }>;
};

type WishlistStore = {
  items: WishlistItem[];
  hasHydrated: boolean;
  hydrateWishlist: () => void;
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  clear: () => void;
  count: () => number;
};

const WISHLIST_STORAGE_KEY = "pilorus-wishlist";

function normalizeWishlistItems(value: unknown): WishlistItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") return [];
    const item = rawItem as Partial<WishlistItem>;
    const saleUnit = item.saleUnit === "PIECE" || item.saleUnit === "BOTH" ? item.saleUnit : "CUBE";
    const variants = Array.isArray(item.variants)
      ? item.variants.flatMap((rawVariant) => {
          if (!rawVariant || typeof rawVariant !== "object") return [];
          const variant = rawVariant as Partial<WishlistItem["variants"][number]>;
          if (typeof variant.id !== "string" || typeof variant.size !== "string") return [];
          return [
            {
              id: variant.id,
              size: variant.size,
              pricePerCube: typeof variant.pricePerCube === "number" ? variant.pricePerCube : null,
              pricePerPiece: typeof variant.pricePerPiece === "number" ? variant.pricePerPiece : null,
              piecesPerCube: typeof variant.piecesPerCube === "number" ? variant.piecesPerCube : null,
              inStock: variant.inStock !== false,
              stockQty: typeof variant.stockQty === "number" ? variant.stockQty : null,
              lowStockThreshold: typeof variant.lowStockThreshold === "number" ? variant.lowStockThreshold : null,
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

function readWishlistItemsFromStorage(): WishlistItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      items?: unknown;
      state?: { items?: unknown };
    };
    return normalizeWishlistItems(parsed.state?.items ?? parsed.items);
  } catch {
    return [];
  }
}

function writeWishlistItemsToStorage(items: WishlistItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({ state: { items }, version: 0 }),
    );
  } catch {
    // The in-memory wishlist still works if storage is blocked.
  }
}

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
  items: [],
  hasHydrated: false,
  hydrateWishlist: () => {
    if (get().hasHydrated) return;
    set({
      items: readWishlistItemsFromStorage(),
      hasHydrated: true,
    });
  },
  add: (item) => {
    const currentItems = get().items;
    if (currentItems.some((existing) => existing.id === item.id)) return;
    const nextItems = [...currentItems, item];
    set({ items: nextItems });
    writeWishlistItemsToStorage(nextItems);
  },
  remove: (id) => {
    const nextItems = get().items.filter((item) => item.id !== id);
    set({ items: nextItems });
    writeWishlistItemsToStorage(nextItems);
  },
  toggle: (item) => {
    const { has, add, remove } = get();
    has(item.id) ? remove(item.id) : add(item);
  },
  has: (id) => get().items.some((item) => item.id === id),
  clear: () => {
    set({ items: [] });
    writeWishlistItemsToStorage([]);
  },
  count: () => get().items.length,
}));
