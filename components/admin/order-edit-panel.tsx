"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Loader2, FileDown, Trash2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { getUnitLabel, getVariantUnitPrice, type ProductUnitType } from "@/lib/product-units";

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

type Variant = { id: string; size: string; pricePerCube: number | null; pricePerPiece: number | null; pricePerSquareMeter?: number | null; inStock?: boolean };
type Product = { id: string; name: string; saleUnit: "CUBE" | "PIECE" | "SQUARE" | "BOTH"; variants: Variant[] };

type NewItem = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: ProductUnitType;
  quantity: number;
  price: number;
};

function orderUnitLabel(unitType: string) {
  return unitType === "CUBE" || unitType === "PIECE" || unitType === "SQUARE"
    ? getUnitLabel(unitType)
    : unitType;
}

export function OrderEditPanel({ order }: { order: OrderEditable }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveError, setSaveError] = useState("");

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
  const [selUnit, setSelUnit] = useState<ProductUnitType>("CUBE");
  const [selQty, setSelQty] = useState(1);

  useEffect(() => {
    if (editing && products.length === 0) {
      fetch("/api/admin/terminal/catalog")
        .then((r) => r.json())
        .then((data) => {
          const sellableProducts = Array.isArray(data)
            ? data.filter((product) => Array.isArray(product?.variants) && product.variants.length > 0)
            : [];
          setProducts(sellableProducts);
        })
        .catch(() => {});
    }
  }, [editing, products.length]);

  const selProduct = products.find((p) => p.id === selProductId);
  const selVariant = selProduct?.variants.find((v) => v.id === selVariantId);
  const selPrice = selVariant ? getVariantUnitPrice(selVariant, selUnit) || 0 : 0;

  // Доступные единицы на основе saleUnit и наличия цен
  const availableUnits = useMemo<ProductUnitType[]>(() => {
    if (!selProduct) return ["CUBE", "PIECE", "SQUARE"];
    const { saleUnit } = selProduct;
    if (saleUnit === "CUBE") return ["CUBE"];
    if (saleUnit === "PIECE") return ["PIECE"];
    if (saleUnit === "SQUARE") return ["SQUARE"];
    const units: ProductUnitType[] = [];
    if (selVariant?.pricePerCube != null) units.push("CUBE");
    if (selVariant?.pricePerSquareMeter != null) units.push("SQUARE");
    if (selVariant?.pricePerPiece != null) units.push("PIECE");
    return units.length > 0 ? units : ["CUBE", "PIECE", "SQUARE"];
  }, [selProduct, selVariant]);

  const totalAmount = useMemo(() => {
    const existingTotal = currentItems
      .filter((it) => !removedIds.includes(it.id))
      .reduce((sum, it) => sum + it.quantity * it.price, 0);
    const newTotal = newItems.reduce((sum, it) => sum + it.quantity * it.price, 0);
    return existingTotal + newTotal + deliveryCost;
  }, [currentItems, removedIds, newItems, deliveryCost]);
  const hasActiveItems = useMemo(() => {
    return currentItems.some((item) => !removedIds.includes(item.id)) || newItems.length > 0;
  }, [currentItems, removedIds, newItems]);

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
    if (!hasActiveItems) {
      setSaveError("В заказе должна остаться хотя бы одна позиция.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сохранить заказ");
      }
      setEditing(false);
      router.refresh();
      toast({ title: "Заказ сохранён" });
    } catch (err: any) {
      const message = err?.message || "Не удалось сохранить заказ";
      setSaveError(message);
      toast({
        title: "Заказ не сохранён",
        description: message,
        variant: "destructive",
      });
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
    setSaveError("");
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

  const actionButtons = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !hasActiveItems}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        Сохранить изменения
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.07]"
      >
        <X className="w-3.5 h-3.5" />
        Отмена
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-3">
      {pdfError && (
        <p className="text-xs text-destructive">{pdfError}</p>
      )}
      {saveError && (
        <p className="text-xs text-destructive">{saveError}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.07] disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          Скачать PDF
        </button>

        {!editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.07]"
        >
          <Pencil className="w-3.5 h-3.5" />
          Редактировать
        </button>
        )}
      </div>

      {editing && (
        <div className="space-y-4 pb-24 lg:pb-32">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Редактирование заказа</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Данные клиента, позиции, доставка и итоговая сумма.
                </p>
              </div>
              {actionButtons}
            </div>
          </div>

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
                    className="w-full px-3 py-2.5 text-base sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Способ оплаты</label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value) => setForm((f) => ({ ...f, paymentMethod: value }))}
                >
                  <SelectTrigger className="h-[46px] text-base sm:text-sm">
                    <SelectValue placeholder="Способ оплаты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Наличные">Наличные</SelectItem>
                    <SelectItem value="Безнал по счёту">Безнал по счёту</SelectItem>
                    <SelectItem value="Наличные / Счёт">Наличные / Счёт</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Комментарий</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Позиции заказа */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Позиции заказа</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
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
                        {item.quantity} {orderUnitLabel(item.unitType)}
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
                          className={`text-xs px-2 py-1 rounded-xl transition-colors ${removed ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-destructive hover:bg-destructive/10"}`}
                        >
                          {removed ? "Вернуть" : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {newItems.map((item, i) => (
                  <tr key={`new-${i}`} className="bg-primary/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.variantSize}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-sm">
                      {item.quantity} {orderUnitLabel(item.unitType)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-right">
                      {(item.quantity * item.price).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setNewItems((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {deliveryCost > 0 && (
                  <tr className="bg-primary/10">
                    <td className="px-4 py-2.5 font-medium">Стоимость доставки</td>
                    <td className="px-4 py-2.5 text-muted-foreground">—</td>
                    <td className="px-4 py-2.5 font-medium text-right">{deliveryCost.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => setDeliveryCost(0)} className="text-destructive hover:bg-destructive/10 p-1 rounded-xl">
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
            </div>

            {/* Добавить товар */}
            <div className="px-5 py-4 border-t border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Добавить позицию</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select
                  value={selProductId}
                  onValueChange={(value) => {
                    const p = products.find((pr) => pr.id === value);
                    setSelProductId(value);
                    setSelVariantId("");
                    if (p) setSelUnit(p.saleUnit === "PIECE" ? "PIECE" : p.saleUnit === "SQUARE" ? "SQUARE" : "CUBE");
                  }}
                >
                  <SelectTrigger className="h-[46px] text-base sm:text-sm">
                    <SelectValue placeholder="Товар" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={selVariantId}
                  onValueChange={setSelVariantId}
                  disabled={!selProduct}
                >
                  <SelectTrigger className="h-[46px] text-base sm:text-sm">
                    <SelectValue placeholder="Размер" />
                  </SelectTrigger>
                  <SelectContent>
                    {selProduct?.variants.map((v) => <SelectItem key={v.id} value={v.id}>{v.size}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={selUnit}
                  onValueChange={(value) => setSelUnit(value as ProductUnitType)}
                  disabled={availableUnits.length <= 1}
                >
                  <SelectTrigger className="h-[46px] text-base sm:text-sm">
                    <SelectValue placeholder="Единица" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.includes("CUBE") && <SelectItem value="CUBE">{"\u043c\u00b3 (\u043a\u0443\u0431\u043e\u043c\u0435\u0442\u0440\u044b)"}</SelectItem>}
                    {availableUnits.includes("SQUARE") && <SelectItem value="SQUARE">{"\u043c\u00b2 (\u043a\u0432\u0430\u0434\u0440\u0430\u0442\u043d\u044b\u0435 \u043c\u0435\u0442\u0440\u044b)"}</SelectItem>}
                    {availableUnits.includes("PIECE") && <SelectItem value="PIECE">{"\u0448\u0442 (\u0448\u0442\u0443\u043a\u0438)"}</SelectItem>}
                  </SelectContent>
                </Select>
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

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Итого к оплате</p>
                <p className="mt-1 text-xl font-bold">{totalAmount.toLocaleString("ru-RU")} ₽</p>
              </div>
              {actionButtons}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
