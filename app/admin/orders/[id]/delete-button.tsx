"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmOpen(false);
        router.push("/admin/orders");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
        className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Удалить заказ
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Переместить заказ в корзину?"
        description="Заказ будет перемещён в корзину. Вы сможете восстановить его позже."
        confirmLabel="Переместить в корзину"
        variant="warning"
        loading={deleting}
      />
    </>
  );
}
