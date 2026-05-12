"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const statuses = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP", "DELIVERED", "COMPLETED", "CANCELLED"] as const;

interface Props {
  orderId: string;
  currentStatus: string;
  onStatusChange?: (status: string) => void;
}

export function OrderStatusSelect({ orderId, currentStatus, onStatusChange }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleChange = async (newStatus: string) => {
    if (newStatus === status || loading) return;

    const previousStatus = status;
    setStatus(newStatus);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(`Status update failed: ${res.status}`);
      }

      onStatusChange?.(newStatus);
      router.refresh();
    } catch (err) {
      setStatus(previousStatus);
      toast({
        title: "Статус не обновлён",
        description: "Проверьте соединение и попробуйте снова.",
        variant: "destructive",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const colors: Record<string, string> = {
    NEW: "bg-primary/10 text-primary",
    CONFIRMED: "bg-primary/10 text-primary",
    PROCESSING: "bg-primary/10 text-primary",
    SHIPPED: "bg-primary/10 text-primary",
    IN_DELIVERY: "bg-primary/10 text-primary",
    READY_PICKUP: "bg-primary/10 text-primary",
    DELIVERED: "bg-muted text-foreground",
    COMPLETED: "bg-muted text-foreground",
    CANCELLED: "bg-destructive/10 text-destructive",
  };

  return (
    <Select
      value={status}
      onValueChange={handleChange}
      disabled={loading}
    >
      <SelectTrigger
        aria-label="Статус заказа"
        className={`h-11 min-h-11 w-[11rem] max-w-full rounded-full border-0 px-3 py-2 text-xs font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${colors[status] || ""}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-2xl border border-border bg-card p-1">
        {statuses.map((s) => (
          <SelectItem
            key={s}
            value={s}
            className="min-h-11 rounded-xl py-2 text-xs font-medium focus:bg-primary/10 focus:text-foreground"
          >
            {ORDER_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
