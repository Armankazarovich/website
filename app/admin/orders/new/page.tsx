"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, Phone, Search, Calculator, ChevronDown } from "lucide-react";

type Variant = {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  inStock: boolean;
};

type Product = {
  id: string;
  name: string;
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  variants: Variant[];
};

type CartItem = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: "CUBE" | "PIECE";
  quantity: number;
  price: number;
};

export default function NewPhoneOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    deliveryAddress: "",
    paymentMethod: "Наличные",
    comment: "",
  });

  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [deliveryCostInput, setDeliveryCostInput] = useState("");

  // Калькулятор доставки
  const [deliveryRates, setDeliveryRates] = useState<Array<{ id: string; vehicleName: string; payload: string; maxVolume: number; basePrice: number }>>([]);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcVolume, setCalcVolume] = useState("");
  const [calcSuggestions, setCalcSuggestions] = useState<typeof deliveryRates>([]);

  useEffect(() => {
    fetch("/api/admin/delivery-rates")
      .then((r) => r.json())
      .then((data) => setDeliveryRates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Для добавления позиции
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [unitType, setUnitType] = useState<"CUBE" | "PIECE">("CUBE");
  const [quantity, setQuantity] = useState(1);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.find((v) => v.id === selectedVariantId);

  // Доступные единицы для выбранного товара/варианта
  const availableUnits = useMemo((): Array<"CUBE" | "PIECE"> => {
    if (!selectedProduct) return ["CUBE", "PIECE"];
    const { saleUnit } = selectedProduct;
    const hasCube = saleUnit !== "PIECE" && (selectedVariant ? selectedVariant.pricePerCube != null : true);
    const hasPiece = saleUnit !== "CUBE" && (selectedVariant ? selectedVariant.pricePerPiece != null : true);
    const units: Array<"CUBE" | "PIECE"> = [];
    if (hasCube) units.push("CUBE");
    if (hasPiece) units.push("PIECE");
    return units.length > 0 ? units : ["CUBE"];
  }, [selectedProduct, selectedVariant]);

  // Автовыбор единицы при смене товара
  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setSelectedVariantId("");
    setProductSearch(product.name);
    setShowProductDropdown(false);
    // Автовыбор единицы
    if (product.saleUnit === "CUBE") setUnitType("CUBE");
    else if (product.saleUnit === "PIECE") setUnitType("PIECE");
    // BOTH — оставить текущий выбор
  };

  // При смене варианта — пересчитать доступные единицы
  useEffect(() => {
    if (!selectedProduct) return;
    const variant = selectedProduct.variants.find((v) => v.id === selectedVariantId);
    if (!variant) return;
    const hasCube = selectedProduct.saleUnit !== "PIECE" && variant.pricePerCube != null;
    const hasPiece = selectedProduct.saleUnit !== "CUBE" && variant.pricePerPiece != null;
    if (unitType === "CUBE" && !hasCube && hasPiece) setUnitType("PIECE");
    if (unitType === "PIECE" && !hasPiece && hasCube) setUnitType("CUBE");
  }, [selectedVariantId]);

  const itemPrice = useMemo(() => {
    if (!selectedVariant) return 0;
    if (unitType === "CUBE") return Number(selectedVariant.pricePerCube ?? 0);
    return Number(selectedVariant.pricePerPiece ?? 0);
  }, [selectedVariant, unitType]);

  const addItem = () => {
    if (!selectedProduct || !selectedVariant || !itemPrice || quantity <= 0) return;
    setItems((prev) => [
      ...prev,
      {
        variantId: selectedVariantId,
        productName: selectedProduct.name,
        variantSize: selectedVariant.size,
        unitType,
        quantity,
        price: itemPrice,
      },
    ]);
    setSelectedProductId("");
    setSelectedVariantId("");
    setProductSearch("");
    setQuantity(1);
  };

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const itemsTotal = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.price, 0),
    [items]
  );
  const totalAmount = itemsTotal + deliveryCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName || !form.guestPhone) { setError("Укажите имя и телефон клиента"); return; }
    if (items.length === 0) { setError("Добавьте хотя бы один товар"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items, totalAmount, deliveryCost }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка");
        return;
      }
      const data = await res.json();
      router.push(`/admin/orders/${data.id}`);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Заказы
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-display font-bold text-2xl flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Заказ по телефону
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Данные клиента */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Клиент</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Имя *", key: "guestName", type: "text", placeholder: "Иван Иванов" },
              { label: "Телефон *", key: "guestPhone", type: "tel", placeholder: "+7 (___) ___-__-__" },
              { label: "Email (для счёта)", key: "guestEmail", type: "email", placeholder: "client@mail.ru" },
              { label: "Адрес доставки", key: "deliveryAddress", type: "text", placeholder: "г. Химки, ул. ..." },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
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
                placeholder="Пожелания, уточнения..."
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Добавить товар */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Добавить товар</h2>
          {loadingProducts ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Загрузка товаров...
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2" ref={searchRef}>
                <label className="text-xs text-muted-foreground mb-1 block">Поиск товара</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Введите название товара..."
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                    onFocus={() => setShowProductDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl shadow-xl max-h-52 overflow-y-auto bg-popover border border-border">
                      {filteredProducts.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => handleSelectProduct(p)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${selectedProductId === p.id ? "font-semibold text-primary bg-primary/10" : "text-foreground"}`}
                        >
                          {p.name}
                          {p.saleUnit === "CUBE" && <span className="ml-2 text-xs text-muted-foreground">м³</span>}
                          {p.saleUnit === "PIECE" && <span className="ml-2 text-xs text-muted-foreground">шт</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Вариант / размер</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">— выберите размер —</option>
                  {selectedProduct?.variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.size}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Единица измерения</label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as "CUBE" | "PIECE")}
                  disabled={availableUnits.length <= 1}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-70"
                >
                  {availableUnits.includes("CUBE") && <option value="CUBE">м³ (кубометры)</option>}
                  {availableUnits.includes("PIECE") && <option value="PIECE">шт (штуки)</option>}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Количество</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
          {selectedVariant && itemPrice > 0 && (
            <p className="text-sm text-muted-foreground">
              Цена: {itemPrice.toLocaleString("ru-RU")} ₽/{unitType === "CUBE" ? "м³" : "шт"} ·
              Сумма: <strong>{(itemPrice * quantity).toLocaleString("ru-RU")} ₽</strong>
            </p>
          )}
          <button
            type="button"
            onClick={addItem}
            disabled={!selectedVariant || !itemPrice || quantity <= 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить позицию
          </button>
        </div>

        {/* Список товаров */}
        {items.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Состав заказа</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Товар</th>
                  <th className="text-right px-4 py-2 font-semibold">Кол-во</th>
                  <th className="text-right px-4 py-2 font-semibold">Цена</th>
                  <th className="text-right px-4 py-2 font-semibold">Сумма</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.variantSize}</p>
                    </td>
                    <td className="px-4 py-2 text-right">{item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{item.price.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-4 py-2 text-right font-semibold">{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => removeItem(i)} className="text-destructive hover:opacity-70">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {deliveryCost > 0 && (
                  <tr className="bg-blue-500/5">
                    <td className="px-4 py-2 font-medium" colSpan={3}>Доставка</td>
                    <td className="px-4 py-2 text-right font-semibold">{deliveryCost.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-4 py-2"></td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t border-border bg-muted/30">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold">Итого:</td>
                  <td className="px-4 py-3 text-right font-bold text-lg">{totalAmount.toLocaleString("ru-RU")} ₽</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Стоимость доставки */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Доставка</h2>

          {/* Калькулятор */}
          <div>
            <button
              type="button"
              onClick={() => setCalcOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity"
            >
              <Calculator className="w-3.5 h-3.5" />
              Калькулятор транспорта
              <ChevronDown className={`w-3 h-3 transition-transform ${calcOpen ? "rotate-180" : ""}`} />
            </button>

            {calcOpen && (
              <div className="mt-3 p-4 bg-muted/30 border border-border rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    placeholder="Объём заказа (м³)"
                    value={calcVolume}
                    onChange={(e) => setCalcVolume(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const vol = parseFloat(calcVolume);
                      if (!vol) return;
                      setCalcSuggestions(deliveryRates.filter((r) => r.maxVolume >= vol).sort((a, b) => a.basePrice - b.basePrice));
                    }}
                    className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Подобрать
                  </button>
                </div>

                {calcSuggestions.length > 0 && (
                  <div className="space-y-1.5">
                    {calcSuggestions.map((r, i) => (
                      <div key={r.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${i === 0 ? "bg-primary/10 border border-primary/20" : "bg-background border border-border"}`}>
                        <div>
                          <span className="text-sm font-medium">{i === 0 ? "⭐ " : ""}{r.vehicleName}</span>
                          <span className="text-xs text-muted-foreground ml-2">{r.payload} · до {r.maxVolume} м³</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDeliveryCostInput(String(r.basePrice));
                            setDeliveryCost(r.basePrice);
                            setCalcOpen(false);
                          }}
                          className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors ml-3 shrink-0"
                        >
                          {r.basePrice.toLocaleString("ru-RU")} ₽ →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {calcVolume && calcSuggestions.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Объём превышает вместимость — нужно несколько рейсов</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              placeholder="Стоимость доставки (₽)"
              value={deliveryCostInput}
              onChange={(e) => {
                setDeliveryCostInput(e.target.value);
                setDeliveryCost(Number(e.target.value) || 0);
              }}
              className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
            <span className="text-xs text-muted-foreground">0 = самовывоз / без доставки</span>
          </div>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Создаём..." : "Создать заказ"}
          </button>
          <Link
            href="/admin/orders"
            className="px-6 py-2.5 border border-border rounded-xl hover:bg-muted/50 transition-colors text-sm"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
