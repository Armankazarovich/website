"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Подтверждён" },
  { value: "PROCESSING", label: "В обработке" },
  { value: "SHIPPED", label: "Отгружен" },
  { value: "IN_DELIVERY", label: "Доставляется" },
  { value: "READY_PICKUP", label: "Готов к выдаче" },
  { value: "DELIVERED", label: "Доставлен" },
  { value: "COMPLETED", label: "Завершён (самовывоз)" },
  { value: "CANCELLED", label: "Отменён" },
];

export function DeliveryStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-1">
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      <select
        value={currentStatus}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
