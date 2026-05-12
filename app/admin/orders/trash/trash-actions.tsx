"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { toast } from "@/components/ui/use-toast";

export function TrashActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"restore" | "delete" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isRestoring = loading === "restore";
  const isDeleting = loading === "delete";

  const restore = async () => {
    if (loading) return;
    setLoading("restore");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: "PUT" });
      if (!res.ok) throw new Error(`Restore failed: ${res.status}`);
      router.refresh();
    } catch {
      toast({
        title: "Заказ не восстановлен",
        description: "Сервер не подтвердил восстановление.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const deletePermanent = async () => {
    if (loading) return;
    setLoading("delete");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}?permanent=true`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Permanent delete failed: ${res.status}`);
      setConfirmOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Заказ не удалён",
        description: "Сервер не подтвердил удаление навсегда.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={restore}
          disabled={loading !== null}
          aria-busy={isRestoring}
          title="Восстановить"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-50"
        >
          {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Восстановить
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={loading !== null}
          aria-busy={isDeleting}
          title="Удалить навсегда"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-destructive/25 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          <span className="sm:sr-only">Удалить навсегда</span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!loading) setConfirmOpen(false);
        }}
        onConfirm={deletePermanent}
        title="Удалить заказ навсегда?"
        description="Это действие нельзя отменить. Заказ будет удалён безвозвратно."
        confirmLabel="Удалить навсегда"
        variant="danger"
        loading={isDeleting}
      />
    </>
  );
}
