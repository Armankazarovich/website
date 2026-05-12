"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { toast } from "@/components/ui/use-toast";

export function ClearTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleClear = async () => {
    if (loading || count === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders/clear-trash", { method: "DELETE" });
      if (!res.ok) throw new Error(`Clear trash failed: ${res.status}`);
      setConfirm(false);
      router.refresh();
    } catch {
      toast({
        title: "Корзина не очищена",
        description: "Сервер не подтвердил удаление заказов.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={loading || count === 0}
        aria-busy={loading}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Очистить корзину
      </button>

      <ConfirmDialog
        open={confirm}
        onClose={() => {
          if (!loading) setConfirm(false);
        }}
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
