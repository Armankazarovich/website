"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";

export function TrashActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    if (!window.confirm("Удалить заказ навсегда? Это действие нельзя отменить.")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/orders/${orderId}?permanent=true`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      <button
        onClick={restore}
        disabled={loading}
        title="Восстановить"
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Восстановить
      </button>
      <button
        onClick={deletePermanent}
        disabled={loading}
        title="Удалить навсегда"
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
