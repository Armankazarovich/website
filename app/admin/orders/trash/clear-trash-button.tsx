"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export function ClearTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleClear = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders/clear-trash", { method: "DELETE" });
      if (res.ok) { setConfirm(false); router.refresh(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Очистить корзину
      </button>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={handleClear}
        title={`Удалить ${count} заказов навсегда?`}
        description="Это действие нельзя отменить. Все заказы из корзины будут удалены безвозвратно."
        confirmLabel="Удалить навсегда"
        variant="danger"
        loading={loading}
      />
    </>
  );
}
