"use client";

import { useAdminConfirm } from "@/components/admin/admin-confirm-provider";
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

export function DeliveryStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const confirmAction = useAdminConfirm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    if (!(await confirmAction("Изменить статус доставки? Клиент и команда могут получить уведомление."))) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, confirm: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Не удалось изменить статус");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось изменить статус",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {saving && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
        <select
          value={currentStatus}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          aria-invalid={Boolean(error)}
          className="min-h-[44px] flex-1 rounded-xl border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
