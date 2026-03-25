"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Loader2, FileDown, Trash2, Plus } from "lucide-react";

type OrderItem = {
  id: string;
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: string;
  quantity: number;
  price: number;
};

type OrderEditable = {
  id: string;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  deliveryAddress: string | null;
  comment: string | null;
  paymentMethod: string;
  totalAmount: number;
  deliveryCost: number;
  items: OrderItem[];
};

type Variant = { id: string; size: string; pricePerCube: number | null; pricePerPiece: number | null };
type Product = { id: string; name: string; saleUnit: "CUBE" | "PIECE" | "BOTH"; variants: Variant[] };

type NewItem = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: "CUBE" | "PIECE";
  quantity: number;
  price: number;
};

export function OrderEditPanel({ order }: { order: OrderEditable }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Поля клиента
  const [form, setForm] = useState({
    guestName: order.guestName || "",
    guestPhone: order.guestPhone || "",
    guestEmail: order.guestEmail || "",
    deliveryAddress: order.deliveryAddress || "",
    comment: order.comment || "",
    paymentMethod: order.paymentMethod || "",
  });

  // Позиции
  const [currentItems, setCurrentItems] = useState<OrderItem[]>(order.items);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [newItems, setNewItems] = useState<NewItem[]>([]);
  const [deliveryCost, setDeliveryCost] = useState(order.deliveryCost);
  const [deliveryCostInput, setDeliveryCostInput] = useState(order.deliveryCost > 0 ? String(order.deliveryCost) : "");

  // Выбор товара для добавления
  const [products, setProducts] = useState<Product[]>([]);
  const [selProductId, setSelProductId] = useState("");
  const [selVariantId, setSelVariantId] = useState("");
  const [selUnit, setSelUnit] = useState<"CUBE" | "PIECE">("CUBE");
  const [selQty, setSelQty] = useState(1);

  useEffect(() => {
    if (editing && products.length === 0) {
      fetch("/api/admin/products")
        .then((r) => r.json())
        .then((data) => setProducts(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [editing]);

  const selProduct = products.find((p) => p.id === selProductId);
  const selVariant = selProduct?.variants.find((v) => v.id === selVariantId);
  const selPrice = selVariant
    ? Number(selUnit === "CUBE" ? selVariant.pricePerCube : selVariant.pricePerPiece) || 0
    : 0;

  // Доступные единицы на основе saleUnit и наличия цен
  const availableUnits = useMemo<("CUBE" | "PIECE")[]>(() => {
    if (!selProduct) return ["CUBE", "PIECE"];
    const { saleUnit } = selProduct;
    if (saleUnit === "CUBE") return ["CUBE"];
    if (saleUnit === "PIECE") return ["PIECE"];
    const units: ("CUBE" | "PIECE")[] = [];
    if (selVariant?.pricePerCube != null) units.push("CUBE");
    if (selVariant?.pricePerPiece != null) units.push("PIECE");
    return units.length > 0 ? units : ["CUBE", "PIECE"];
  }, [selProduct, selVariant]);

  const totalAmount = useMemo(() => {
    const existingTotal = currentItems
      .filter((it) => !removedIds.includes(it.id))
      .reduce((sum, it) => sum + it.quantity * it.price, 0);
    const newTotal = newItems.reduce((sum, it) => sum + it.quantity * it.price, 0);
    return existingTotal + newTotal + deliveryCost;
  }, [currentItems, removedIds, newItems, deliveryCost]);

  const addItem = () => {
    if (!selProduct || !selVariant || !selPrice || selQty <= 0) return;
    setNewItems((prev) => [
      ...prev,
      {
        variantId: selVariantId,
        productName: selProduct.name,
        variantSize: selVariant.size,
        unitType: selUnit,
        quantity: selQty,
        price: selPrice,
      },
    ]);
    setSelProductId("");
    setSelVariantId("");
    setSelQty(1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          removeItemIds: removedIds,
          addItems: newItems,
          totalAmount,
          deliveryCost,
        }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({
      guestName: order.guestName || "",
      guestPhone: order.guestPhone || "",
      guestEmail: order.guestEmail || "",
      deliveryAddress: order.deliveryAddress || "",
      comment: order.comment || "",
      paymentMethod: order.paymentMethod || "",
    });
    setCurrentItems(order.items);
    setRemovedIds([]);
    setNewItems([]);
    setDeliveryCost(order.deliveryCost);
    setDeliveryCostInput(order.deliveryCost > 0 ? String(order.deliveryCost) : "");
  };

  const [pdfError, setPdfError] = useState("");

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setPdfError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPdfError(data.error || `Ошибка ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schet-${order.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setPdfError(err.message || "Ошибка загрузки PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {pdfError && (
        <p className="text-xs text-destructive">{pdfError}</p>
      )}
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
        <div className="w-full mt-4 space-y-4">
          {/* Данные клиента */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-sm">Данные клиента</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Имя", key: "guestName", type: "text" },
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
                  <option>Наличные</option>
                  <option>Безнал по счёту</option>
                  <option>Наличные / Счёт</option>
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
          </div>

          {/* Позиции заказа */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Позиции заказа</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {currentItems.map((item) => {
                  const removed = removedIds.includes(item.id);
                  return (
                    <tr key={item.id} className={removed ? "opacity-40 line-through" : ""}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.variantSize}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-sm">
                        {item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-right">
                        {(item.quantity * item.price).toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setRemovedIds((prev) =>
                              removed ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                            )
                          }
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${removed ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-destructive hover:bg-destructive/10"}`}
                        >
                          {removed ? "Вернуть" : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {newItems.map((item, i) => (
                  <tr key={`new-${i}`} className="bg-green-500/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.variantSize}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-sm">
                      {item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-right">
                      {(item.quantity * item.price).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setNewItems((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {deliveryCost > 0 && (
                  <tr className="bg-blue-500/5">
                    <td className="px-4 py-2.5 font-medium">Стоимость доставки</td>
                    <td className="px-4 py-2.5 text-muted-foreground">—</td>
                    <td className="px-4 py-2.5 font-medium text-right">{deliveryCost.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => setDeliveryCost(0)} className="text-destructive hover:bg-destructive/10 p-1 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/30">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-semibold text-sm">Итого:</td>
                  <td className="px-4 py-3 font-bold text-base text-right">{totalAmount.toLocaleString("ru-RU")} ₽</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            {/* Добавить товар */}
            <div className="px-5 py-4 border-t border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Добавить позицию</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selProductId}
                  onChange={(e) => {
                    const p = products.find((pr) => pr.id === e.target.value);
                    setSelProductId(e.target.value);
                    setSelVariantId("");
                    if (p) setSelUnit(p.saleUnit === "PIECE" ? "PIECE" : "CUBE");
                  }}
                  className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— товар —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select
                  value={selVariantId}
                  onChange={(e) => setSelVariantId(e.target.value)}
                  disabled={!selProduct}
                  className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none disabled:opacity-50"
                >
                  <option value="">— размер —</option>
                  {selProduct?.variants.map((v) => <option key={v.id} value={v.id}>{v.size}</option>)}
                </select>
                <select
                  value={selUnit}
                  onChange={(e) => setSelUnit(e.target.value as "CUBE" | "PIECE")}
                  disabled={availableUnits.length <= 1}
                  className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none disabled:opacity-70"
                >
                  {availableUnits.includes("CUBE") && <option value="CUBE">м³ (кубометры)</option>}
                  {availableUnits.includes("PIECE") && <option value="PIECE">шт (штуки)</option>}
                </select>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={selQty}
                  onChange={(e) => setSelQty(Number(e.target.value))}
                  placeholder="Кол-во"
                  className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none"
                />
              </div>
              {selVariant && selPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Цена: {selPrice.toLocaleString("ru-RU")} ₽ · Сумма: <strong>{(selPrice * selQty).toLocaleString("ru-RU")} ₽</strong>
                </p>
              )}
              <button
                type="button"
                onClick={addItem}
                disabled={!selVariant || !selPrice}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/70 border border-border rounded-xl transition-colors disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить товар
              </button>

              {/* Доставка */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={0}
                  placeholder="Стоимость доставки (₽)"
                  value={deliveryCostInput}
                  onChange={(e) => {
                    setDeliveryCostInput(e.target.value);
                    setDeliveryCost(Number(e.target.value) || 0);
                  }}
                  className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none w-56"
                />
                <span className="text-xs text-muted-foreground">стоимость доставки</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Сохранить изменения
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
