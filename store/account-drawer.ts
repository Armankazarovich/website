import { create } from "zustand";

interface AccountDrawerStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAccountDrawer = create<AccountDrawerStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
