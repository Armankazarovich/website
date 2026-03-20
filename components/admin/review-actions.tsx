"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2 } from "lucide-react";

interface Props {
  reviewId: string;
  approved: boolean;
}

export function ReviewActions({ reviewId, approved: initialApproved }: Props) {
  const [approved, setApproved] = useState(initialApproved);

  const toggleApprove = async () => {
    await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !approved }),
    });
    setApproved(!approved);
  };

  const deleteReview = async () => {
    if (!confirm("Удалить отзыв?")) return;
    await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
    window.location.reload();
  };

  return (
    <div className="flex gap-2 ml-4">
      <Button size="sm" variant={approved ? "outline" : "default"} onClick={toggleApprove}>
        <CheckCircle className="w-3 h-3 mr-1" />
        {approved ? "Скрыть" : "Опубликовать"}
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteReview}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}
