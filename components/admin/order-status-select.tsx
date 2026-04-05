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

  const colors: Record<string, string> = {
    NEW: "bg-blue-500/15 text-blue-500",
    CONFIRMED: "bg-purple-500/15 text-purple-500",
    PROCESSING: "bg-yellow-500/15 text-yellow-600",
    SHIPPED: "bg-orange-500/15 text-orange-500",
    IN_DELIVERY: "bg-sky-500/15 text-sky-500",
    READY_PICKUP: "bg-violet-500/15 text-violet-500",
    DELIVERED: "bg-green-500/15 text-green-600",
    COMPLETED: "bg-teal-500/15 text-teal-600",
    CANCELLED: "bg-red-500/15 text-red-500",
  };

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className={`text-xs font-semibold rounded-full px-3 py-1 border-0 cursor-pointer ${colors[status] || ""}`}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}
