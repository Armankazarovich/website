import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UnitType = "CUBE" | "PIECE";

export interface CartItem {
  id: string; // variantId + unitType
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantSize: string;
  productImage?: string;
  unitType: UnitType;
  quantity: number;
  price: number; // price per unit
}

interface CartStore {
  items: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  loadItems: (items: CartItem[]) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartOpen: false,

      setCartOpen: (open) => set({ cartOpen: open }),

      addItem: (item) => {
        const id = `${item.variantId}-${item.unitType}`;
        const existing = get().items.find((i) => i.id === id);

        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              i.id === id
                ? {
                    ...i,
                    quantity: parseFloat((i.quantity + item.quantity).toFixed(1)),
                    // Обновляем фото если изменилось в админке
                    productImage: item.productImage || i.productImage,
                    price: item.price,
                  }
                : i
            ),
          }));
        } else {
          set((state) => ({ items: [...state.items, { ...item, id }] }));
        }
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      loadItems: (items) => set({ items }),

      totalItems: () => get().items.length,

      totalPrice: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: "pilo-rus-cart",
      // Don't persist cartOpen state
      partialize: (state) => ({ items: state.items }),
    }
  )
);
