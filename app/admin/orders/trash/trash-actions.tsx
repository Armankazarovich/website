"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export function TrashActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const restore = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/orders/${orderId}`, { method: "PUT" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const deletePermanent = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/orders/${orderId}?permanent=true`, { method: "DELETE" });
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 justify-end">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        <button
          onClick={restore}
          disabled={loading}
          title="Восстановить"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Восстановить
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loading}
          title="Удалить навсегда"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={deletePermanent}
        title="Удалить заказ навсегда?"
        description="Это действие нельзя отменить. Заказ будет удалён безвозвратно."
        confirmLabel="Удалить навсегда"
        variant="danger"
        loading={loading}
      />
    </>
  );
}
