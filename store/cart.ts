import { create } from "zustand";

export type UnitType = "CUBE" | "PIECE";

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
  loadItems: (items: CartItem[]) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

const CART_STORAGE_KEY = "pilo-rus-cart";

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") return [];
    const item = rawItem as Partial<CartItem>;
    const unitType: UnitType = item.unitType === "PIECE" ? "PIECE" : "CUBE";
    const quantity = Number(item.quantity);
    const price = Number(item.price);

    if (
      typeof item.variantId !== "string" ||
      typeof item.productId !== "string" ||
      typeof item.productName !== "string" ||
      typeof item.productSlug !== "string" ||
      typeof item.variantSize !== "string" ||
      !Number.isFinite(quantity) ||
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
      },
    ];
  });
}

function readCartItemsFromStorage(): CartItem[] {
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

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  cartOpen: false,
  hasHydrated: false,

  setHasHydrated: (hasHydrated) => set({ hasHydrated }),

  hydrateCart: () => {
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

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aray:metrika-goal", {
          detail: {
            goal: "aray_cart_add",
            params: {
              product: item.productName,
              variantId: item.variantId,
              quantity: item.quantity,
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
                quantity: parseFloat((i.quantity + item.quantity).toFixed(1)),
                productImage: item.productImage || i.productImage,
                price: item.price,
              }
            : i,
        )
      : [...currentItems, { ...item, id }];

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

    const nextItems = (get().items ?? []).map((i) =>
      i.id === id ? { ...i, quantity } : i,
    );
    set({ items: nextItems });
    writeCartItemsToStorage(nextItems);
  },

  clearCart: () => {
    set({ items: [] });
    writeCartItemsToStorage([]);
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
