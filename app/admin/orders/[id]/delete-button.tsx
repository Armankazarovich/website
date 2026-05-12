"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmOpen(false);
        router.push("/admin/orders");
        router.refresh();
      } else {
        toast({
          title: "Заказ не удалён",
          description: "Сервер не подтвердил перенос в корзину.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Заказ не удалён",
        description: "Проверьте соединение и попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
        aria-busy={deleting}
        variant="destructive"
        className="min-h-[44px] w-full rounded-xl px-4 text-sm font-semibold sm:w-auto"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Удалить заказ
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!deleting) setConfirmOpen(false);
        }}
        onConfirm={handleDelete}
        title="Переместить заказ в корзину?"
        description="Заказ будет перемещён в корзину. Его можно будет восстановить позже."
        confirmLabel="Переместить в корзину"
        variant="warning"
        loading={deleting}
      />
    </>
  );
}
