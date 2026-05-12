"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Globe,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { useAdminPageActions, useAdminPageHeader } from "@/components/admin/admin-page-actions";

type UnitType = "CUBE" | "PIECE";

type Variant = {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  inStock: boolean;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  images: string[];
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  active?: boolean;
  category?: { name?: string | null; slug?: string | null } | null;
  variants: Variant[];
};

type NicheOption = {
  slug: string;
  name: string;
  description: string;
  count: number;
};

type CategoryOption = {
  slug: string;
  name: string;
  count: number;
};

type Supplier = {
  id: string;
  name: string;
  category: string;
  categorySlug: string;
  products: Product[];
  variantsCount: number;
  withPrice: number;
  inStock: number;
  minPrice: number | null;
};

type ExchangeCartItem = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: UnitType;
  quantity: number;
  price: number;
};

type ProductFilter = "all" | "stock" | "price" | "photos";

const TERMINAL_DRAFT_STORAGE_KEY = "aray-terminal-order-draft:v1";

const EXCHANGE_NICHES: Array<Omit<NicheOption, "count">> = [
  { slug: "lumber", name: "Пиломатериалы", description: "доска, брус, фанера, лиственница" },
  { slug: "building-materials", name: "Стройматериалы", description: "смеси, крепёж, утеплитель, кровля" },
  { slug: "services", name: "Услуги", description: "доставка, распил, монтаж, подрядчики" },
  { slug: "hospitality", name: "Кафе и рестораны", description: "меню, кухня, поставки, бронирования" },
];

const FILTERS: Array<{ key: ProductFilter; label: string }> = [
  { key: "all", label: "Все" },
  { key: "stock", label: "В наличии" },
  { key: "price", label: "С ценой" },
  { key: "photos", label: "С фото" },
];

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function toPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function getImage(product: Product) {
  return product.images.find((image) => typeof image === "string" && image.trim().length > 0) || null;
}

function collectPrices(product: Product) {
  return product.variants.flatMap((variant) => [toPrice(variant.pricePerCube), toPrice(variant.pricePerPiece)]).filter((price): price is number => price !== null);
}

function getMinPrice(product: Product) {
  const prices = collectPrices(product);
  return prices.length ? Math.min(...prices) : null;
}

function getVariantPrice(variant: Variant | null | undefined, unitType: UnitType) {
  if (!variant) return null;
  return unitType === "CUBE" ? toPrice(variant.pricePerCube) : toPrice(variant.pricePerPiece);
}

function getDefaultUnit(product: Product, variant: Variant | null | undefined): UnitType {
  if (product.saleUnit === "PIECE") return "PIECE";
  if (product.saleUnit === "CUBE") return "CUBE";
  return toPrice(variant?.pricePerCube) ? "CUBE" : "PIECE";
}

function getDefaultVariant(product: Product) {
  return product.variants.find((variant) => variant.inStock && collectPrices({ ...product, variants: [variant] }).length > 0)
    || product.variants.find((variant) => collectPrices({ ...product, variants: [variant] }).length > 0)
    || product.variants[0]
    || null;
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    slug: product.slug || product.id,
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
    saleUnit: product.saleUnit || "BOTH",
    category: product.category || { name: "Без категории", slug: "uncategorized" },
    variants: (product.variants || []).map((variant) => ({
      ...variant,
      pricePerCube: toPrice(variant.pricePerCube),
      pricePerPiece: toPrice(variant.pricePerPiece),
      inStock: variant.inStock !== false,
    })),
  };
}

function getProductNicheSlug(_product: Product) {
  return "lumber";
}

function buildSupplier(category: CategoryOption, products: Product[]): Supplier {
  const prices = products.flatMap(collectPrices);
  return {
    id: `pilorus-${category.slug}`,
    name: "ПилоРус",
    category: category.name,
    categorySlug: category.slug,
    products,
    variantsCount: products.reduce((sum, product) => sum + product.variants.length, 0),
    withPrice: products.filter((product) => collectPrices(product).length > 0).length,
    inStock: products.filter((product) => product.variants.some((variant) => variant.inStock)).length,
    minPrice: prices.length ? Math.min(...prices) : null,
  };
}

export default function AdminExchangePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeNiche, setActiveNiche] = useState("lumber");
  const [category, setCategory] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [cart, setCart] = useState<ExchangeCartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("CUBE");
  const [quantity, setQuantity] = useState(1);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить каталог биржи");
      const data = await response.json() as Product[];
      setProducts(data.map(normalizeProduct).filter((product) => product.active !== false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Биржа не загрузилась");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const niches = useMemo<NicheOption[]>(() => (
    EXCHANGE_NICHES.map((niche) => ({
      ...niche,
      count: products.filter((product) => getProductNicheSlug(product) === niche.slug).length,
    }))
  ), [products]);
  const activeNicheInfo = niches.find((niche) => niche.slug === activeNiche) || niches[0];

  const nicheProducts = useMemo(
    () => products.filter((product) => getProductNicheSlug(product) === activeNiche),
    [activeNiche, products],
  );

  const categories = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, CategoryOption>();
    nicheProducts.forEach((product) => {
      const slug = product.category?.slug || "uncategorized";
      const name = product.category?.name || "Без категории";
      const current = map.get(slug);
      map.set(slug, { slug, name, count: (current?.count || 0) + 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [nicheProducts]);

  const selectedCategory = categories.find((item) => item.slug === category) || null;

  const suppliers = useMemo(() => {
    if (!selectedCategory) return [];
    return [selectedCategory]
      .map((item) => buildSupplier(item, nicheProducts.filter((product) => (product.category?.slug || "uncategorized") === item.slug)))
      .filter((supplier) => supplier.products.length > 0);
  }, [nicheProducts, selectedCategory]);

  useEffect(() => {
    if (!supplierId) return;
    if (!suppliers.some((supplier) => supplier.id === supplierId)) setSupplierId("");
  }, [supplierId, suppliers]);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId) || null;
  const marketplaceStats = useMemo(() => {
    const prices = nicheProducts.flatMap(collectPrices);
    return {
      niches: niches.length,
      categories: categories.length,
      suppliers: selectedCategory ? suppliers.length : categories.length,
      products: nicheProducts.length,
      withPhotos: nicheProducts.filter((product) => getImage(product)).length,
      inStock: nicheProducts.filter((product) => product.variants.some((variant) => variant.inStock)).length,
      minPrice: prices.length ? Math.min(...prices) : null,
      averagePrice: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null,
    };
  }, [categories.length, nicheProducts, niches.length, selectedCategory, suppliers.length]);

  const normalizedQuery = query.trim().toLowerCase().replace(/ё/g, "е");
  const visibleCategories = useMemo(() => {
    if (!normalizedQuery || selectedCategory) return categories;
    return categories.filter((item) => item.name.toLowerCase().replace(/ё/g, "е").includes(normalizedQuery));
  }, [categories, normalizedQuery, selectedCategory]);

  const visibleSuppliers = useMemo(() => {
    if (!normalizedQuery || selectedSupplier) return suppliers;
    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().replace(/ё/g, "е").includes(normalizedQuery)
      || supplier.category.toLowerCase().replace(/ё/g, "е").includes(normalizedQuery)
    );
  }, [normalizedQuery, selectedSupplier, suppliers]);

  const supplierProducts = useMemo(() => {
    const source = selectedSupplier?.products || [];
    return source.filter((product) => {
      if (filter === "stock" && !product.variants.some((variant) => variant.inStock)) return false;
      if (filter === "price" && collectPrices(product).length === 0) return false;
      if (filter === "photos" && !getImage(product)) return false;
      if (!normalizedQuery) return true;
      return product.name.toLowerCase().replace(/ё/g, "е").includes(normalizedQuery)
        || product.variants.some((variant) => variant.size.toLowerCase().replace(/ё/g, "е").includes(normalizedQuery))
        || (product.category?.name || "").toLowerCase().replace(/ё/g, "е").includes(normalizedQuery);
    });
  }, [filter, normalizedQuery, selectedSupplier]);

  const selectedVariant = useMemo(
    () => selectedProduct?.variants.find((variant) => variant.id === selectedVariantId) || null,
    [selectedProduct, selectedVariantId],
  );
  const itemPrice = getVariantPrice(selectedVariant, unitType);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const cartQty = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const openProduct = (product: Product) => {
    const variant = getDefaultVariant(product);
    setSelectedProduct(product);
    setSelectedVariantId(variant?.id || "");
    setUnitType(getDefaultUnit(product, variant));
    setQuantity(1);
  };

  const addItem = useCallback((product: Product, variant: Variant, nextUnitType: UnitType, nextQuantity: number) => {
    const price = getVariantPrice(variant, nextUnitType);
    if (!price || !variant.inStock || nextQuantity <= 0) return;
    setCart((current) => {
      const existingIndex = current.findIndex((item) =>
        item.variantId === variant.id &&
        item.unitType === nextUnitType &&
        item.price === price
      );
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Number((item.quantity + nextQuantity).toFixed(3)) }
            : item,
        );
      }
      return [
        ...current,
        {
          variantId: variant.id,
          productName: product.name,
          variantSize: variant.size,
          unitType: nextUnitType,
          quantity: nextQuantity,
          price,
        },
      ];
    });
  }, []);

  const addProductQuick = (product: Product) => {
    const variant = getDefaultVariant(product);
    if (!variant) return openProduct(product);
    const nextUnit = getDefaultUnit(product, variant);
    const price = getVariantPrice(variant, nextUnit);
    if (!price || !variant.inStock) return openProduct(product);
    addItem(product, variant, nextUnit, 1);
  };

  const addSelectedProduct = () => {
    if (!selectedProduct || !selectedVariant || !itemPrice) return;
    addItem(selectedProduct, selectedVariant, unitType, quantity);
    setSelectedProduct(null);
  };

  const removeCartItem = (index: number) => {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const openTerminalCheckout = () => {
    if (typeof window === "undefined" || cart.length === 0) return;
    window.localStorage.setItem(
      TERMINAL_DRAFT_STORAGE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        form: {
          guestName: "",
          guestPhone: "",
          guestEmail: "",
          fulfillmentType: "DELIVERY",
          fulfillmentDetail: "",
          paymentMethod: "Наличные",
          contactMethod: "PHONE",
          contactUsername: "",
          comment: selectedSupplier ? `Заказ собран на бирже: ${selectedSupplier.name}` : "Заказ собран на бирже",
        },
        items: cart,
        deliveryCost: 0,
        deliveryCostInput: "",
        terminalMode: "ORDER",
        workMode: "MOBILE",
        receiptMode: "ELECTRONIC",
        orderPanelView: "checkout",
      }),
    );
    router.push("/admin/orders/new?mode=order");
  };

  const exchangeStage = selectedSupplier ? "products" : selectedCategory ? "suppliers" : "categories";
  const searchPlaceholder =
    exchangeStage === "products"
      ? "Найдите товар, размер или сорт..."
      : exchangeStage === "suppliers"
        ? "Найдите поставщика в категории..."
        : "Найдите категорию внутри направления...";

  useAdminPageHeader({
    title: "ARAY Market",
    subtitle: selectedSupplier
      ? `pilomaterialy.aray.online · ${selectedSupplier.category} · ${selectedSupplier.name}`
      : selectedCategory
        ? `pilomaterialy.aray.online · ${activeNicheInfo.name} · ${selectedCategory.name}`
        : "aray.online · рынки, категории и поставщики",
    backLabel: "Терминал",
    backHref: "/admin/orders/new",
    logoSrc: "aray",
    logoAlt: "ARAY Production",
    contextKey: `exchange:${activeNiche}:${selectedCategory?.slug || "categories"}:${selectedSupplier?.id || "suppliers"}:${cart.length}:${cartTotal}`,
  });

  useAdminPageActions({
    onRefresh: loadProducts,
    actions: [
      { id: "terminal", label: "Терминал", icon: ShoppingCart, href: "/admin/orders/new", variant: "ghost" },
      { id: `checkout:${cart.length}:${cartTotal}`, label: "Оформить", icon: Check, onClick: openTerminalCheckout, variant: "primary", disabled: cart.length === 0 },
    ],
  });

  return (
    <div className={`admin-page-frame admin-page-frame-fluid ${cart.length ? "pb-56" : "pb-36"} md:pb-8`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span>ARAY Market</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>{activeNicheInfo.name}</span>
                  {selectedCategory && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span>{selectedCategory.name}</span>
                    </>
                  )}
                  {selectedSupplier && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="text-primary">{selectedSupplier.name}</span>
                    </>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
                  {exchangeStage === "products"
                    ? "Каталог поставщика"
                    : exchangeStage === "suppliers"
                      ? "Поставщики в категории"
                      : "ARAY Market"}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {exchangeStage === "products"
                    ? "Товары с фото, размерами, наличием и быстрым добавлением в заказ. Витрина готовится под публичный поддомен поставщика."
                    : exchangeStage === "suppliers"
                      ? `${selectedCategory?.name}: сравните поставщиков, цены и наличие, затем откройте нужную витрину.`
                      : "Единая сеть рынков на aray.online: каждое направление получает свой поддомен, PWA-приложение, уведомления и автоматизацию заказов."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-primary">
                    aray.online
                  </span>
                  <span className="rounded-full border border-border bg-background px-3 py-1.5 text-muted-foreground">
                    pilomaterialy.aray.online
                  </span>
                  <span className="rounded-full border border-border bg-background px-3 py-1.5 text-muted-foreground">
                    PWA + push + CRM
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                {[
                  ["Направления", marketplaceStats.niches],
                  ["Категории", marketplaceStats.categories],
                  [selectedCategory ? "Поставщики" : "Витрины", marketplaceStats.suppliers],
                  ["Товары", marketplaceStats.products],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 text-base font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="sticky top-0 z-20 space-y-3 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur md:top-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-base outline-none transition focus:ring-2 focus:ring-primary/20 sm:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
                  aria-label="Очистить поиск"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {niches.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => {
                    setActiveNiche(item.slug);
                    setCategory("");
                    setSupplierId("");
                    setFilter("all");
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeNiche === item.slug
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {item.name}
                  <span className="ml-1 opacity-70">{item.count}</span>
                </button>
              ))}
            </div>

            {selectedCategory && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSupplier) {
                      setSupplierId("");
                      setFilter("all");
                      return;
                    }
                    setCategory("");
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {selectedSupplier ? "Поставщики" : "Категории"}
                </button>
                <span className="inline-flex shrink-0 items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  {selectedCategory.name}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAnalytics(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Аналитика
                </button>
                {selectedSupplier && FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        filter === item.key
                          ? "border-primary/45 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-card p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Загружаю биржу</p>
                  <p className="mt-1 text-sm text-muted-foreground">Поставщики, фото, цены и остатки</p>
                </div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Биржа не открылась</p>
                  <p className="mt-1">{error}</p>
                  <button
                    type="button"
                    onClick={loadProducts}
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/30 bg-background px-3 text-sm font-semibold text-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Повторить
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && !selectedCategory && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleCategories.map((item) => {
                const categoryProducts = nicheProducts.filter((product) => (product.category?.slug || "uncategorized") === item.slug);
                const prices = categoryProducts.flatMap(collectPrices);
                const inStock = categoryProducts.filter((product) => product.variants.some((variant) => variant.inStock)).length;
                const photos = categoryProducts.filter((product) => getImage(product)).length;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      setCategory(item.slug);
                      setSupplierId("");
                      setQuery("");
                      setFilter("all");
                    }}
                    className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.04]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-tight text-foreground">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.count} товаров · поставщики внутри</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Цена</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{prices.length ? `от ${formatMoney(Math.min(...prices))}` : "по запросу"}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Наличие</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{inStock}/{item.count}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Фото</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{photos}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">Категория рынка</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        Выбрать поставщика
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
              {visibleCategories.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                  В этом направлении пока нет подходящих категорий.
                </div>
              )}
            </section>
          )}

          {!loading && !error && selectedCategory && !selectedSupplier && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => {
                    setSupplierId(supplier.id);
                    setQuery("");
                    setFilter("all");
                  }}
                  className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold leading-tight text-foreground">{supplier.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{supplier.category} · {supplier.products.length} товаров</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Цена</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{supplier.minPrice ? `от ${formatMoney(supplier.minPrice)}` : "нет"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Наличие</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{supplier.inStock}/{supplier.products.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Фото</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{supplier.products.filter((product) => getImage(product)).length}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-muted-foreground">Поставщик категории</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Открыть витрину
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </button>
              ))}
              {visibleSuppliers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                  В этой категории пока нет поставщиков.
                </div>
              )}
            </section>
          )}

          {!loading && !error && selectedSupplier && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Поставщик</p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">{selectedSupplier.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedSupplier.category} · {selectedSupplier.products.length} позиций · {selectedSupplier.inStock} в наличии
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Старт</p>
                      <p className="mt-1 text-sm font-bold">{selectedSupplier.minPrice ? formatMoney(selectedSupplier.minPrice) : "нет цены"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">С ценой</p>
                      <p className="mt-1 text-sm font-bold">{selectedSupplier.withPrice}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">В заказе</p>
                      <p className="mt-1 text-sm font-bold">{cart.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {supplierProducts.map((product) => {
                  const image = getImage(product);
                  const minPrice = getMinPrice(product);
                  const inStock = product.variants.some((variant) => variant.inStock);
                  return (
                    <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/35">
                      <button type="button" onClick={() => openProduct(product)} className="block w-full text-left">
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted/20">
                          {image ? (
                            <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package className="h-10 w-10" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-h-[2.5rem] text-sm font-semibold leading-tight text-foreground line-clamp-2">{product.name}</p>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              inStock ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/20 text-muted-foreground"
                            }`}>
                              {inStock ? "есть" : "нет"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{product.category?.name || selectedSupplier.category}</p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-base font-bold text-foreground">{minPrice ? `от ${formatMoney(minPrice)}` : "цена по запросу"}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.saleUnit === "CUBE" ? "м³" : product.saleUnit === "PIECE" ? "шт" : "м³/шт"} · {product.variants.length} разм.
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                      <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
                        <button
                          type="button"
                          onClick={() => openProduct(product)}
                          className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                        >
                          Подробнее
                        </button>
                        <button
                          type="button"
                          onClick={() => addProductQuick(product)}
                          disabled={!inStock}
                          className="h-10 rounded-xl border border-primary/45 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40"
                        >
                          В заказ
                        </button>
                      </div>
                    </article>
                  );
                })}
                {supplierProducts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
                    Позиции не найдены. Попробуйте другой фильтр или очистите поиск.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-4">
            <CartPanel cart={cart} total={cartTotal} quantity={cartQty} onRemove={removeCartItem} onCheckout={openTerminalCheckout} />
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">ARAY Market Network</p>
                  <p className="text-xs text-muted-foreground">родитель aray.online</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Админка управляет рынком, а публичные поддомены продают: `pilomaterialy.aray.online`, дальше стройматериалы, услуги, кафе и другие направления.
              </p>
              <div className="mt-3 grid gap-2">
                {[
                  { icon: Smartphone, title: "PWA", text: "быстрый запуск с телефона" },
                  { icon: Bell, title: "Push", text: "заказы, заявки и статусы" },
                  { icon: TrendingUp, title: "Автоматизация", text: "CRM, корзина и ARAY-сценарии" },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {cart.length > 0 && (
        <div className="fixed inset-x-4 z-40 xl:hidden" style={{ bottom: "calc(5.35rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="rounded-2xl border border-primary/35 bg-card/95 p-3 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Капсула биржи</p>
                <p className="truncate text-xs text-muted-foreground">{cart.length} поз. · {formatMoney(cartTotal)}</p>
              </div>
              <button
                type="button"
                onClick={openTerminalCheckout}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-4 text-sm font-semibold text-primary"
              >
                <Check className="h-4 w-4" />
                Оформить
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminModal
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || "Позиция"}
        subtitle={selectedSupplier?.name || "Биржа"}
        size="lg"
        footer={(
          <button
            type="button"
            onClick={addSelectedProduct}
            disabled={!selectedProduct || !selectedVariant || !itemPrice || !selectedVariant.inStock}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40 sm:w-auto"
          >
            <ShoppingCart className="h-4 w-4" />
            В заказ {itemPrice ? `· ${formatMoney(itemPrice * quantity)}` : ""}
          </button>
        )}
      >
        {selectedProduct && (
          <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
              <div className="aspect-[4/3]">
                {getImage(selectedProduct) ? (
                  <img src={getImage(selectedProduct) || ""} alt={selectedProduct.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Package className="h-12 w-12" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Размер</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {selectedProduct.variants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;
                    const price = getVariantPrice(variant, getDefaultUnit(selectedProduct, variant));
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setUnitType(getDefaultUnit(selectedProduct, variant));
                        }}
                        disabled={!variant.inStock || !price}
                        className={`min-h-16 rounded-xl border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-primary/45 bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:border-primary/30 disabled:opacity-45"
                        }`}
                      >
                        <span className="block font-mono text-xs font-semibold">{variant.size}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{price ? formatMoney(price) : "нет цены"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedProduct.saleUnit === "BOTH" && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Единица</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["CUBE", "PIECE"] as const).map((unit) => {
                      const available = Boolean(getVariantPrice(selectedVariant, unit));
                      return (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setUnitType(unit)}
                          disabled={!available}
                          className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                            unitType === unit
                              ? "border-primary/45 bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/30 disabled:opacity-45"
                          }`}
                        >
                          {unit === "CUBE" ? "м³" : "шт"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Количество</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(unitType === "CUBE" ? 0.1 : 1, Number((current - (unitType === "CUBE" ? 0.1 : 1)).toFixed(1))))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    value={quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value.replace(",", "."));
                      if (Number.isFinite(next)) setQuantity(next);
                    }}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-center text-base font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Number((current + (unitType === "CUBE" ? 0.1 : 1)).toFixed(1)))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Аналитика биржи"
        subtitle={selectedSupplier?.name || "Площадка"}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Средняя цена", marketplaceStats.averagePrice ? formatMoney(marketplaceStats.averagePrice) : "нет цены"],
            ["Минимальная цена", marketplaceStats.minPrice ? formatMoney(marketplaceStats.minPrice) : "нет цены"],
            ["С фото", `${marketplaceStats.withPhotos}/${marketplaceStats.products}`],
            ["В наличии", `${marketplaceStats.inStock}/${marketplaceStats.products}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-base font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Следующий слой</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Потом сюда можно добавить реальные поставщики, рейтинги, сроки доставки, спрос из Директа/Метрики и отдельные публичные витрины. Сейчас ядро уже отделено от кассы.
          </p>
        </div>
      </AdminModal>
    </div>
  );
}

function CartPanel({
  cart,
  total,
  quantity,
  onRemove,
  onCheckout,
}: {
  cart: ExchangeCartItem[];
  total: number;
  quantity: number;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Капсула биржи</p>
            <p className="text-xs text-muted-foreground">{cart.length} поз. · {quantity.toLocaleString("ru-RU")} ед.</p>
          </div>
        </div>
        <p className="text-base font-bold text-primary">{formatMoney(total)}</p>
      </div>

      <div className="mt-4 space-y-2">
        {cart.map((item, index) => (
          <div key={`${item.variantId}-${item.unitType}-${index}`} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-tight">{item.productName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.variantSize} · {item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Убрать позицию"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm font-bold text-foreground">{formatMoney(item.price * item.quantity)}</p>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-background p-4 text-center text-sm text-muted-foreground">
            Добавьте позиции из витрины поставщика.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40"
      >
        <Check className="h-4 w-4" />
        Оформить в терминале
      </button>

      <Link href="/admin/orders/new" className="mt-2 flex h-10 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
        Открыть кассу
      </Link>
    </div>
  );
}
