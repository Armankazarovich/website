"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Minus, Trash2, Loader2, Phone, Search, Calculator,
  ChevronDown, ChevronRight, User, MessageSquare, X, ShoppingCart,
  CreditCard, Banknote, Building2, Check, AlertCircle, Zap, BookOpen,
  ChevronUp, MapPin, Truck, Package, Star, Info,
  Hand, Ruler, TrendingUp, TreePine, Clock, CheckCircle2,
} from "lucide-react";
import { AdminBack } from "@/components/admin/admin-back";

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
  category?: { name: string; slug: string };
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

// ── Скрипты продаж для менеджера ────────────────────────────────
const SCRIPTS: { id: string; label: string; icon: React.ElementType; color: string; text: string; tip: string }[] = [
  {
    id: "greeting",
    label: "Приветствие",
    icon: Hand,
    color: "bg-primary/10 border-primary/20 text-primary",
    text: "«Компания ПилоРус, меня зовут [имя], добрый день! Чем могу помочь?»",
    tip: "Представьтесь по имени — это повышает доверие клиента.",
  },
  {
    id: "volume",
    label: "Уточнить объём",
    icon: Ruler,
    color: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    text: "«Скажите, какой объём материала планируете? Лучше заказать с запасом 10–15% — отходы при раскрое неизбежны.»",
    tip: "Запас 10% = меньше дозаказов = довольный клиент.",
  },
  {
    id: "upsell",
    label: "Апсейл (крупный заказ)",
    icon: TrendingUp,
    color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    text: "«При заказе от 5 м³ мы предоставляем бесплатную доставку по Химкам. Итого выйдет даже выгоднее, чем везти самостоятельно.»",
    tip: "Порог бесплатной доставки — главный рычаг увеличения чека.",
  },
  {
    id: "quality",
    label: "Вопрос о качестве",
    icon: TreePine,
    color: "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
    text: "«Для каких целей берёте? Для бани — рекомендую лиственницу (не гниёт), для стропил — сосну 1 сорт. Для чернового пола — 2 сорт сэкономит бюджет.»",
    tip: "Экспертный совет = доверие = повторные покупки.",
  },
  {
    id: "urgency",
    label: "Срочность",
    icon: Clock,
    color: "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400",
    text: "«Сейчас сезон — склад быстро расходится. Могу зафиксировать вашу позицию, оплата в течение 1–2 дней. Так точно получите нужное количество.»",
    tip: "Сезонная срочность реальна — используйте честно.",
  },
  {
    id: "objection",
    label: "Возражение «дорого»",
    icon: MessageSquare,
    color: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    text: "«Понимаю. Давайте посмотрим на сорт — 2 сорт той же породы обойдётся на 15–20% дешевле. Плюс у нас нет скрытых доборов за объём.»",
    tip: "Не снижайте цену — предложите альтернативу внутри ассортимента.",
  },
  {
    id: "closing",
    label: "Закрытие сделки",
    icon: CheckCircle2,
    color: "bg-primary/10 border-primary/20 text-primary",
    text: "«Итого [сумма] ₽, доставка [дата/самовывоз]. Оформляем? Уточните имя и телефон для заказа.»",
    tip: "Называйте конкретную сумму и дату — клиенту проще сказать «да».",
  },
];

const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

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

  // Delivery rates
  const [deliveryRates, setDeliveryRates] = useState<Array<{ id: string; vehicleName: string; payload: string; maxVolume: number; basePrice: number }>>([]);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcVolume, setCalcVolume] = useState("");
  const [calcSuggestions, setCalcSuggestions] = useState<typeof deliveryRates>([]);

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [unitType, setUnitType] = useState<"CUBE" | "PIECE">("CUBE");
  const [quantity, setQuantity] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // UI
  const [showScripts, setShowScripts] = useState(false);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const [showClientForm, setShowClientForm] = useState(true);
  const [addedFlash, setAddedFlash] = useState<string | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/delivery-rates")
      .then((r) => r.json())
      .then((data) => setDeliveryRates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    products.forEach((p) => {
      if (p.category) cats.set(p.category.slug, p.category.name);
    });
    return [{ slug: "all", name: "Все" }, ...Array.from(cats.entries()).map(([slug, name]) => ({ slug, name }))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = activeCategory === "all" || p.category?.slug === activeCategory;
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.variants.some((v) => v.size.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [products, productSearch, activeCategory]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.find((v) => v.id === selectedVariantId);

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

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProductId(product.id);
    setSelectedVariantId("");
    setProductSearch("");
    setShowProductDropdown(false);
    if (product.saleUnit === "CUBE") setUnitType("CUBE");
    else if (product.saleUnit === "PIECE") setUnitType("PIECE");
    // auto-select first in-stock variant
    const firstVariant = product.variants.find((v) => v.inStock) || product.variants[0];
    if (firstVariant) setSelectedVariantId(firstVariant.id);
  }, []);

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

  const addItem = useCallback(() => {
    if (!selectedProduct || !selectedVariant || !itemPrice || quantity <= 0) return;
    const name = selectedProduct.name;
    setItems((prev) => [
      ...prev,
      {
        variantId: selectedVariantId,
        productName: name,
        variantSize: selectedVariant.size,
        unitType,
        quantity,
        price: itemPrice,
      },
    ]);
    setAddedFlash(name);
    setTimeout(() => setAddedFlash(null), 1500);
    setSelectedProductId("");
    setSelectedVariantId("");
    setProductSearch("");
    setQuantity(1);
    searchRef.current?.focus();
  }, [selectedProduct, selectedVariant, selectedVariantId, itemPrice, unitType, quantity]);

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateQty = (i: number, q: number) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, quantity: q } : it));

  const itemsTotal = useMemo(() => items.reduce((sum, it) => sum + it.quantity * it.price, 0), [items]);
  const totalAmount = itemsTotal + deliveryCost;
  const totalVolume = useMemo(() => items.filter((i) => i.unitType === "CUBE").reduce((s, i) => s + i.quantity, 0), [items]);

  const handleSubmit = async () => {
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
      if (!res.ok) { const d = await res.json(); setError(d.error || "Ошибка"); return; }
      const data = await res.json();
      router.push(`/admin/orders/${data.id}`);
    } catch { setError("Ошибка сети"); }
    finally { setSaving(false); }
  };

  const PAYMENT_OPTS = [
    { label: "Наличные", icon: Banknote, value: "Наличные" },
    { label: "Безнал", icon: Building2, value: "Безнал по счёту" },
    { label: "Карта", icon: CreditCard, value: "Карта" },
  ];

  return (
    <div className="h-[calc(100dvh-148px)] md:h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <AdminBack />
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm md:text-base">Терминал</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scripts toggle — hidden on mobile */}
          <button
            onClick={() => setShowScripts((v) => !v)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showScripts ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Скрипты
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || items.length === 0 || !form.guestName}
            className="hidden md:flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Создать заказ
          </button>
        </div>
      </div>

      {/* ── Main POS Layout ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── LEFT: Product Catalog ── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border">
          {/* Search bar */}
          <div className="px-3 py-2 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Поиск товара или размера... (50×150, брус, вагонка)"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {productSearch && (
                <button onClick={() => setProductSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-3 py-1.5 border-b border-border overflow-x-auto shrink-0 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product grid + variant selector */}
          <div className="flex flex-1 overflow-hidden">
            {/* Product grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Загрузка...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map((p) => {
                    const minP = p.variants.reduce((mn, v) => {
                      const price = v.pricePerCube ?? v.pricePerPiece ?? Infinity;
                      return price < mn ? price : mn;
                    }, Infinity);
                    const isSelected = selectedProductId === p.id;
                    const hasStock = p.variants.some((v) => v.inStock);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => handleSelectProduct(p)}
                        className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30"
                            : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        {!hasStock && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">нет</span>
                        )}
                        <Package className={`w-5 h-5 mb-1.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-xs font-semibold leading-tight line-clamp-2">{p.name}</p>
                        {p.category && <p className="text-[10px] text-muted-foreground mt-0.5">{p.category.name}</p>}
                        {minP !== Infinity && (
                          <p className={`text-xs font-bold mt-1.5 ${isSelected ? "text-primary" : "text-foreground"}`}>
                            от {minP.toLocaleString("ru-RU")} ₽
                          </p>
                        )}
                        <p className={`text-[10px] mt-0.5 ${isSelected ? "text-primary/70" : "text-muted-foreground"}`}>
                          {p.saleUnit === "CUBE" ? "м³" : p.saleUnit === "PIECE" ? "шт" : "м³/шт"} · {p.variants.length} разм.
                        </p>
                      </button>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-4 py-12 text-center text-sm text-muted-foreground">
                      Товары не найдены
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Variant selector panel — desktop only */}
            {selectedProduct && (
              <div className="hidden md:flex md:flex-col md:w-52 border-l border-border shrink-0 bg-card">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Настройка</p>
                  <p className="text-sm font-semibold line-clamp-2">{selectedProduct.name}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Variants */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                      Размер <span className="text-muted-foreground/50 normal-case">({selectedProduct.variants.length})</span>
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {selectedProduct.variants.map((v) => {
                        const price = unitType === "CUBE" ? v.pricePerCube : v.pricePerPiece;
                        const isSelected = selectedVariantId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-left transition-colors border relative ${
                              isSelected
                                ? "bg-primary/10 border-primary/50"
                                : v.inStock
                                ? "border-border hover:border-primary/30 hover:bg-muted/50"
                                : "border-border/40 opacity-50"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                            <span className={`font-mono text-[10px] leading-tight ${isSelected ? "text-primary font-semibold" : ""}`}>
                              {v.size}
                            </span>
                            <span className={`text-[11px] font-bold mt-0.5 ${
                              isSelected ? "text-primary" : v.inStock ? "text-emerald-500" : "text-muted-foreground/50"
                            }`}>
                              {price != null ? `${Number(price).toLocaleString()} ₽` : "—"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Unit */}
                  {availableUnits.length > 1 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Единица</p>
                      <div className="flex gap-1">
                        {availableUnits.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setUnitType(u)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${unitType === u ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/30"}`}
                          >
                            {u === "CUBE" ? "м³" : "шт"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Количество</p>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setQuantity((q) => Math.max(0.1, +(q - (unitType === "CUBE" ? 0.5 : 1)).toFixed(2)))}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                      <input
                        type="number"
                        min={0.01}
                        step={unitType === "CUBE" ? 0.1 : 1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="flex-1 text-center py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <button type="button" onClick={() => setQuantity((q) => +(q + (unitType === "CUBE" ? 0.5 : 1)).toFixed(2))}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    {selectedVariant && itemPrice > 0 && (
                      <div className="mt-2 p-2 bg-white/[0.04] rounded-xl border border-white/10">
                        <p className="text-[10px] text-muted-foreground">Сумма</p>
                        <p className="text-sm font-bold text-primary">{fmt(itemPrice * quantity)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(itemPrice)} / {unitType === "CUBE" ? "м³" : "шт"}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 border-t border-border">
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!selectedVariant || !itemPrice || quantity <= 0}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    В заказ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Order Panel ── */}
        <div className={`
          ${showMobileCart
            ? "fixed inset-0 z-50 flex flex-col bg-card"
            : "hidden md:flex md:flex-col"
          }
          md:relative md:w-80 xl:w-96 md:border-l md:border-border overflow-hidden shrink-0
        `}>
          {/* Mobile close button */}
          {showMobileCart && (
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Корзина ({items.length} поз.)</span>
              </div>
              <button onClick={() => setShowMobileCart(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Client section */}
          <div className="border-b border-border shrink-0">
            <button
              onClick={() => setShowClientForm((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Клиент</span>
                {form.guestName && (
                  <span className="text-xs text-muted-foreground truncate max-w-24">{form.guestName}</span>
                )}
              </div>
              {showClientForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showClientForm && (
              <div className="px-4 pb-3 space-y-2.5">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Имя *</label>
                    <input
                      type="text"
                      placeholder="Иван Иванов"
                      value={form.guestName}
                      onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Телефон *</label>
                    <input
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={form.guestPhone}
                      onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Адрес доставки</label>
                    <input
                      type="text"
                      placeholder="г. Химки, ул. ..."
                      value={form.deliveryAddress}
                      onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Комментарий</label>
                    <textarea
                      rows={2}
                      placeholder="Пожелания, уточнения..."
                      value={form.comment}
                      onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                <ShoppingCart className="w-8 h-8 opacity-30" />
                <p className="text-xs">Добавьте товары из каталога</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{item.variantSize}</p>
                      </div>
                      <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQty(i, Math.max(0.1, +(item.quantity - (item.unitType === "CUBE" ? 0.5 : 1)).toFixed(2)))}
                          className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-xs hover:bg-muted"
                        >−</button>
                        <span className="text-sm font-mono w-12 text-center">
                          {item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(i, +(item.quantity + (item.unitType === "CUBE" ? 0.5 : 1)).toFixed(2))}
                          className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-xs hover:bg-muted"
                        >+</button>
                      </div>
                      <p className="text-sm font-bold">{fmt(item.quantity * item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery */}
          <div className="border-t border-border px-4 py-3 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Truck className="w-3.5 h-3.5" />
                Доставка
              </div>
              <button
                type="button"
                onClick={() => setCalcOpen((v) => !v)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Calculator className="w-3 h-3" />
                Калькулятор
                {totalVolume > 0 && <span className="text-muted-foreground">({totalVolume.toFixed(1)} м³)</span>}
              </button>
            </div>

            {calcOpen && (
              <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    placeholder="м³"
                    value={calcVolume || (totalVolume > 0 ? totalVolume.toFixed(1) : "")}
                    onChange={(e) => setCalcVolume(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const vol = parseFloat(calcVolume || String(totalVolume));
                      if (!vol) return;
                      setCalcSuggestions(deliveryRates.filter((r) => r.maxVolume >= vol).sort((a, b) => a.basePrice - b.basePrice));
                    }}
                    className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Подобрать
                  </button>
                </div>
                {calcSuggestions.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setDeliveryCostInput(String(r.basePrice)); setDeliveryCost(r.basePrice); setCalcOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs border transition-colors hover:border-primary/40 ${i === 0 ? "bg-white/[0.04] border-white/10" : "bg-background border-border"}`}
                  >
                    <span className="flex items-center gap-1">{i === 0 && <Star className="w-3 h-3 text-amber-400 shrink-0" />}{r.vehicleName} · {r.payload}</span>
                    <span className="font-bold">{r.basePrice.toLocaleString()} ₽</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="0 = самовывоз"
                value={deliveryCostInput}
                onChange={(e) => { setDeliveryCostInput(e.target.value); setDeliveryCost(Number(e.target.value) || 0); }}
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-xs text-muted-foreground shrink-0">₽</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="border-t border-border px-4 py-3 shrink-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Оплата</p>
            <div className="flex gap-1.5">
              {PAYMENT_OPTS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, paymentMethod: opt.value }))}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-colors ${
                      form.paymentMethod === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total & submit */}
          <div className="border-t border-border px-4 py-4 shrink-0 bg-muted/10">
            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-3">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Товары ({items.length} поз.)</span>
                <span>{fmt(itemsTotal)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Доставка</span>
                  <span>{fmt(deliveryCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-border pt-1.5 mt-1.5">
                <span>ИТОГО</span>
                <span className="text-primary text-lg">{fmt(totalAmount)}</span>
              </div>
              {totalVolume > 0 && (
                <p className="text-[11px] text-muted-foreground text-right">{totalVolume.toFixed(2)} м³</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || items.length === 0 || !form.guestName || !form.guestPhone}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 active:scale-[0.98]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
              Создать заказ
            </button>
          </div>
        </div>

        {/* ── Floating mobile cart button ── */}
        {!showMobileCart && (
          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            className="md:hidden fixed right-4 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-2xl shadow-lg font-bold text-sm active:scale-[0.96] transition-all"
            style={{ bottom: "calc(100px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 4px 20px hsl(var(--primary)/0.4)" }}
          >
            <ShoppingCart className="w-5 h-5" />
            {items.length > 0 ? (
              <>
                <span>{items.length} поз.</span>
                <span className="opacity-70">·</span>
                <span>{totalAmount.toLocaleString("ru-RU")} ₽</span>
              </>
            ) : (
              <span>Корзина пуста</span>
            )}
          </button>
        )}

        {/* ── SCRIPTS Drawer (over right panel) ── */}
        {showScripts && (
          <div className="absolute inset-0 z-50 flex items-stretch pointer-events-none">
            <div className="flex-1" onClick={() => setShowScripts(false)} style={{ pointerEvents: "auto" }} />
            <div className="w-96 bg-card border-l border-border shadow-lg flex flex-col overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <p className="font-semibold">Скрипты продаж</p>
                </div>
                <button onClick={() => setShowScripts(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground px-4 py-2 border-b border-border bg-muted/20">
                Нажмите на скрипт — текст готов к использованию в разговоре
              </p>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {SCRIPTS.map((s) => (
                  <div key={s.id} className={`rounded-xl border p-3 cursor-pointer transition-all ${s.color} ${activeScript === s.id ? "ring-2 ring-current/40" : ""}`}
                    onClick={() => setActiveScript(activeScript === s.id ? null : s.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <s.icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-semibold">{s.label}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeScript === s.id ? "rotate-180" : ""}`} />
                    </div>
                    {activeScript === s.id && (
                      <div className="mt-3 space-y-2">
                        <div className="bg-background/60 rounded-lg p-3 text-sm leading-relaxed border border-current/10">
                          {s.text}
                        </div>
                        <div className="flex items-start gap-1.5 text-[11px] opacity-80">
                          <Info className="w-3 h-3 shrink-0 mt-0.5" />
                          <p>{s.tip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Quick tip at bottom */}
              <div className="border-t border-border p-4 bg-muted/20">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  💡 <strong>Главное правило:</strong> сначала выясните потребность, потом называйте цену.
                  Уточните объём, срок, цель — и предложите точное решение.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE: Variant Bottom Sheet ── */}
      {selectedProduct && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProductId("")} />
          <div className="relative bg-card rounded-t-2xl shadow-2xl flex flex-col max-h-[82dvh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Выбор варианта</p>
                <p className="text-sm font-semibold line-clamp-1">{selectedProduct.name}</p>
              </div>
              <button type="button" onClick={() => setSelectedProductId("")}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Variants grid */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                  Размер <span className="text-muted-foreground/50 normal-case">({selectedProduct.variants.length})</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedProduct.variants.map((v) => {
                    const price = unitType === "CUBE" ? v.pricePerCube : v.pricePerPiece;
                    const isSel = selectedVariantId === v.id;
                    return (
                      <button key={v.id} type="button" onClick={() => setSelectedVariantId(v.id)}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-xl text-left transition-colors border relative ${
                          isSel ? "bg-primary/10 border-primary/50" : v.inStock ? "border-border hover:border-primary/30 hover:bg-muted/50" : "border-border/40 opacity-50"
                        }`}>
                        {isSel && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />}
                        <span className={`font-mono text-xs leading-tight ${isSel ? "text-primary font-semibold" : ""}`}>{v.size}</span>
                        <span className={`text-xs font-bold mt-1 ${isSel ? "text-primary" : v.inStock ? "text-emerald-500" : "text-muted-foreground/50"}`}>
                          {price != null ? `${Number(price).toLocaleString()} ₽` : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unit type */}
              {availableUnits.length > 1 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Единица измерения</p>
                  <div className="flex gap-2">
                    {availableUnits.map((u) => (
                      <button key={u} type="button" onClick={() => setUnitType(u)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${unitType === u ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/30"}`}>
                        {u === "CUBE" ? "м³" : "шт"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Количество</p>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setQuantity((q) => Math.max(0.1, +(q - (unitType === "CUBE" ? 0.5 : 1)).toFixed(2)))}
                    className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-xl font-bold hover:bg-muted active:scale-95">−</button>
                  <input type="number" min={0.01} step={unitType === "CUBE" ? 0.1 : 1} value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="flex-1 text-center py-3 text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <button type="button"
                    onClick={() => setQuantity((q) => +(q + (unitType === "CUBE" ? 0.5 : 1)).toFixed(2))}
                    className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-xl font-bold hover:bg-muted active:scale-95">+</button>
                </div>
                {selectedVariant && itemPrice > 0 && (
                  <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Сумма</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{fmt(itemPrice * quantity)}</p>
                      <p className="text-xs text-muted-foreground">{fmt(itemPrice)} / {unitType === "CUBE" ? "м³" : "шт"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add button with safe area */}
            <div className="p-4 border-t border-border shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
              <button type="button" onClick={addItem}
                disabled={!selectedVariant || !itemPrice || quantity <= 0}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-2xl text-base font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 active:scale-[0.98]">
                <Plus className="w-5 h-5" />
                В заказ {selectedVariant && itemPrice > 0 ? `· ${fmt(itemPrice * quantity)}` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Added flash */}
      {addedFlash && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-bottom-2 fade-in duration-200">
          <Check className="w-4 h-4" />
          Добавлено: {addedFlash}
        </div>
      )}
    </div>
  );
}
