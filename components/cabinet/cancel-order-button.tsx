"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";

export function CancelOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: number }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCancel() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cabinet/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Не удалось отменить заказ");
        setLoading(false);
        return;
      }
      setShowConfirm(false);
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
      setLoading(false);
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors"
      >
        <XCircle className="w-4 h-4" /> Отменить заказ
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !loading && setShowConfirm(false)}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="font-semibold text-base">Отменить заказ #{orderNumber}?</h3>
          <p className="text-xs text-muted-foreground mt-1">Отмена возможна только пока заказ не передан в обработку.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Причина (опционально)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Например: нашёл дешевле / передумал"
            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-base sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            style={{ fontSize: 16 }}
            maxLength={500}
            disabled={loading}
          />
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            Не отменять
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Отменить заказ
          </button>
        </div>
      </div>
    </div>
  );
}
