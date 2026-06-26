import { create } from "zustand";

export type UnitType = "CUBE" | "PIECE" | "SQUARE";

export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantSize: string;
  productImage?: string;
  unitType: UnitType;
  quantity: number;
  price: number;
  maxQuantity?: number | null;
}

interface CartStore {
  items: CartItem[];
  cartOpen: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  hydrateCart: () => void;
  setCartOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  persistCart: () => void;
  loadItems: (items: CartItem[]) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

const CART_STORAGE_KEY = "pilo-rus-cart";

function normalizeMaxQuantity(value: unknown): number | null {
  if (value == null) return null;
  const max = Number(value);
  return Number.isFinite(max) && max >= 0 ? max : null;
}

function normalizeQuantity(value: unknown, maxQuantity: number | null): number {
  const quantity = Number(value);
  const safeQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
  if (maxQuantity === null) return safeQuantity;
  return Math.min(safeQuantity, maxQuantity);
}

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") return [];
    const item = rawItem as Partial<CartItem>;
    const unitType: UnitType =
      item.unitType === "PIECE" || item.unitType === "SQUARE" ? item.unitType : "CUBE";
    const maxQuantity = normalizeMaxQuantity(item.maxQuantity);
    const quantity = normalizeQuantity(item.quantity, maxQuantity);
    const price = Number(item.price);

    if (
      typeof item.variantId !== "string" ||
      typeof item.productId !== "string" ||
      typeof item.productName !== "string" ||
      typeof item.productSlug !== "string" ||
      typeof item.variantSize !== "string" ||
      quantity <= 0 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return [];
    }

    return [
      {
        id: typeof item.id === "string" ? item.id : `${item.variantId}-${unitType}`,
        variantId: item.variantId,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        variantSize: item.variantSize,
        productImage: typeof item.productImage === "string" ? item.productImage : undefined,
        unitType,
        quantity,
        price,
        maxQuantity,
      },
    ];
  });
}

export function readCartItemsFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as {
      items?: unknown;
      state?: { items?: unknown };
    };

    return normalizeCartItems(parsed.state?.items ?? parsed.items);
  } catch {
    return [];
  }
}

function writeCartItemsToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ state: { items }, version: 0 }),
    );
  } catch {
    // Storage can be blocked in private modes. The in-memory cart still works.
  }
}

function getInitialCartItems(): CartItem[] {
  return typeof window === "undefined" ? [] : readCartItemsFromStorage();
}

export const useCartStore = create<CartStore>()((set, get) => ({
  items: getInitialCartItems(),
  cartOpen: false,
  hasHydrated: typeof window !== "undefined",

  setHasHydrated: (hasHydrated) => set({ hasHydrated }),

  hydrateCart: () => {
    if (get().hasHydrated) return;

    const currentItems = normalizeCartItems(get().items);
    if (currentItems.length > 0) {
      writeCartItemsToStorage(currentItems);
      set({ items: currentItems, hasHydrated: true });
      return;
    }

    set({
      items: readCartItemsFromStorage(),
      hasHydrated: true,
    });
  },

  setCartOpen: (open) => set({ cartOpen: open }),

  addItem: (item) => {
    const id = `${item.variantId}-${item.unitType}`;
    const currentItems = get().items ?? [];
    const existing = currentItems.find((i) => i.id === id);
    const maxQuantity = normalizeMaxQuantity(item.maxQuantity ?? existing?.maxQuantity);
    const itemQuantity = normalizeQuantity(item.quantity, maxQuantity);
    if (itemQuantity <= 0) return;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aray:metrika-goal", {
          detail: {
            goal: "aray_cart_add",
            params: {
              product: item.productName,
              variantId: item.variantId,
              quantity: itemQuantity,
              unit: item.unitType,
            },
          },
        }),
      );
    }

    const nextItems = existing
      ? currentItems.map((i) =>
          i.id === id
            ? {
                ...i,
                quantity: parseFloat(normalizeQuantity(i.quantity + itemQuantity, maxQuantity).toFixed(1)),
                productImage: item.productImage || i.productImage,
                price: item.price,
                maxQuantity,
              }
            : i,
        )
      : [...currentItems, { ...item, id, quantity: itemQuantity, maxQuantity }];

    set({ items: nextItems });
    writeCartItemsToStorage(nextItems);
  },

  removeItem: (id) => {
    const nextItems = (get().items ?? []).filter((i) => i.id !== id);
    set({ items: nextItems });
    writeCartItemsToStorage(nextItems);
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }

    const nextItems = (get().items ?? []).flatMap((i) => {
      if (i.id !== id) return [i];
      const nextQuantity = normalizeQuantity(quantity, normalizeMaxQuantity(i.maxQuantity));
      return nextQuantity > 0 ? [{ ...i, quantity: nextQuantity }] : [];
    });
    set({ items: nextItems });
    writeCartItemsToStorage(nextItems);
  },

  clearCart: () => {
    set({ items: [] });
    writeCartItemsToStorage([]);
  },

  persistCart: () => {
    writeCartItemsToStorage(normalizeCartItems(get().items));
  },

  loadItems: (items) => {
    const nextItems = normalizeCartItems(items);
    set({ items: nextItems });
    writeCartItemsToStorage(nextItems);
  },

  totalItems: () => (get().items ?? []).length,

  totalPrice: () =>
    (get().items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
