"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function ClearTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    if (!window.confirm(`Удалить навсегда все ${count} заказов из корзины? Это действие нельзя отменить.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders/clear-trash", { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClear}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      Очистить корзину
    </button>
  );
}
