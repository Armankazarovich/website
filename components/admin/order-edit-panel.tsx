"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Loader2, FileDown } from "lucide-react";

type OrderEditable = {
  id: string;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  deliveryAddress: string | null;
  comment: string | null;
  paymentMethod: string;
};

export function OrderEditPanel({ order }: { order: OrderEditable }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState({
    guestName: order.guestName || "",
    guestPhone: order.guestPhone || "",
    guestEmail: order.guestEmail || "",
    deliveryAddress: order.deliveryAddress || "",
    comment: order.comment || "",
    paymentMethod: order.paymentMethod || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/pdf`);
      if (!res.ok) throw new Error("PDF error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schet-${order.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={handleDownloadPdf}
        disabled={downloading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50"
      >
        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        Скачать PDF
      </button>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-xl hover:bg-muted/50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Редактировать
        </button>
      ) : (
        <div className="w-full mt-4 bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">Редактирование заказа</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Имя клиента", key: "guestName", type: "text" },
              { label: "Телефон", key: "guestPhone", type: "tel" },
              { label: "Email", key: "guestEmail", type: "email" },
              { label: "Адрес доставки", key: "deliveryAddress", type: "text" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Способ оплаты</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Наличные">Наличные</option>
                <option value="Безнал по счёту">Безнал по счёту</option>
                <option value="Наличные / Счёт">Наличные / Счёт</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Комментарий</label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Сохранить
            </button>
            <button
              onClick={() => { setEditing(false); setForm({
                guestName: order.guestName || "",
                guestPhone: order.guestPhone || "",
                guestEmail: order.guestEmail || "",
                deliveryAddress: order.deliveryAddress || "",
                comment: order.comment || "",
                paymentMethod: order.paymentMethod || "",
              }); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
