"use client";

import React, { useState } from "react";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

const statuses = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP", "DELIVERED", "COMPLETED", "CANCELLED"] as const;

interface Props {
  orderId: string;
  currentStatus: string;
}

export function OrderStatusSelect({ orderId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus: string) => {
    setLoading(true);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // WCAG AA contrast: dark text (≥900) in light theme, bright text in dark
  const colors: Record<string, string> = {
    NEW: "bg-blue-500/15 text-blue-900 dark:text-blue-400",
    CONFIRMED: "bg-purple-500/15 text-purple-900 dark:text-purple-400",
    PROCESSING: "bg-amber-400/20 text-amber-900 dark:text-amber-400",
    SHIPPED: "bg-orange-500/15 text-orange-900 dark:text-orange-400",
    IN_DELIVERY: "bg-sky-500/15 text-sky-900 dark:text-sky-400",
    READY_PICKUP: "bg-violet-500/15 text-violet-900 dark:text-violet-400",
    DELIVERED: "bg-green-500/15 text-green-900 dark:text-green-400",
    COMPLETED: "bg-teal-500/15 text-teal-900 dark:text-teal-400",
    CANCELLED: "bg-red-500/15 text-red-900 dark:text-red-400",
  };

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 cursor-pointer transition-transform active:scale-95 ${colors[status] || ""}`}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}
