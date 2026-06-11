"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type AdminConfirmVariant = "danger" | "warning" | "default" | "destructive";

type AdminConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: AdminConfirmVariant;
};

type PendingConfirm = Required<Pick<AdminConfirmOptions, "title" | "confirmLabel" | "cancelLabel">> &
  Omit<AdminConfirmOptions, "title" | "confirmLabel" | "cancelLabel"> & {
    resolve: (confirmed: boolean) => void;
  };

const AdminConfirmContext = createContext<((options: string | AdminConfirmOptions) => Promise<boolean>) | null>(null);

function normalizeConfirmOptions(options: string | AdminConfirmOptions): AdminConfirmOptions {
  return typeof options === "string" ? { description: options } : options;
}

export function AdminConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirmAction = useCallback((options: string | AdminConfirmOptions) => {
    const normalized = normalizeConfirmOptions(options);
    return new Promise<boolean>((resolve) => {
      setPending({
        title: normalized.title || "Подтвердить действие",
        description: normalized.description,
        confirmLabel: normalized.confirmLabel || "Подтвердить",
        cancelLabel: normalized.cancelLabel || "Отмена",
        variant: normalized.variant || "warning",
        resolve,
      });
    });
  }, []);

  const close = useCallback(() => {
    setPending((current) => {
      current?.resolve(false);
      return null;
    });
  }, []);

  const confirm = useCallback(() => {
    setPending((current) => {
      current?.resolve(true);
      return null;
    });
  }, []);

  const value = useMemo(() => confirmAction, [confirmAction]);

  return (
    <AdminConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <ConfirmDialog
          open
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          variant={pending.variant}
          onClose={close}
          onConfirm={confirm}
        />
      )}
    </AdminConfirmContext.Provider>
  );
}

export function useAdminConfirm() {
  const context = useContext(AdminConfirmContext);
  if (!context) {
    throw new Error("useAdminConfirm must be used inside AdminConfirmProvider");
  }
  return context;
}
