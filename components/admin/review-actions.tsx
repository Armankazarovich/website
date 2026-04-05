"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

interface Props {
  reviewId: string;
  approved: boolean;
}

export function ReviewActions({ reviewId, approved: initialApproved }: Props) {
  const [approved, setApproved] = useState(initialApproved);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleApprove = async () => {
    await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !approved }),
    });
    setApproved(!approved);
  };

  const deleteReview = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      setConfirmDelete(false);
      window.location.reload();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex gap-2 ml-4">
      <Button size="sm" variant={approved ? "outline" : "default"} onClick={toggleApprove}>
        <CheckCircle className="w-3 h-3 mr-1" />
        {approved ? "Скрыть" : "Опубликовать"}
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="w-3 h-3" />
      </Button>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteReview}
        title="Удалить отзыв?"
        description="Отзыв будет удалён без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
