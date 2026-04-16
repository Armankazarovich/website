"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calculator,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */
interface ProductVariant {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  piecesPerCube: number | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  saleUnit: string;
  images: string[];
  variants: ProductVariant[];
}

/* ── Math helpers ───────────────────────────────────── */
function parseDimensions(size: string) {
  const clean = size
    .replace(/\s/g, "")
    .replace(/х/gi, "x")
    .replace(/×/g, "x");
  const parts = clean
    .split("x")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
  if (parts.length >= 3) {
    return { thickness: parts[0], width: parts[1], length: parts[2] / 1000 };
  }
  if (parts.length === 2) {
    return { thickness: parts[0], width: parts[1], length: 6 };
  }
  return null;
}

function calcVolume(thickness: number, width: number, length: number, qty: number) {
  return (thickness / 1000) * (width / 1000) * length * qty;
}

function formatVolume(v: number) {
  if (v === 0) return "0";
  if (v < 0.001) return v.toFixed(6);
  if (v < 0.1) return v.toFixed(4);
  return parseFloat(v.toFixed(4)).toString();
}

/* ── Input component ────────────────────────────────── */
function NumInput({
  label,
  unit,
  value,
  onChange,
  min = 0.001,
  step = 1,
  hint,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v > 0) onChange(v);
          }}
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-12"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Page component ──────────────────────────────────── */
export default function CalculatorPage() {
  const { addItem, setCartOpen } = useCartStore();

  /* Dimension state */
  const [thickness, setThickness] = useState(50);
  const [width, setWidth] = useState(150);
  const [length, setLength] = useState(6);
  const [quantity, setQuantity] = useState(10);
  const [pricePerCube, setPricePerCube] = useState(15000);
  const [pricePerPiece, setPricePerPiece] = useState<number | null>(null);
  const [cubeNeed, setCubeNeed] = useState(1);
  const [sqmNeed, setSqmNeed] = useState(10);

  /* UI state */
  const [mode, setMode] = useState<"pieces" | "cube" | "sqm">("pieces");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [added, setAdded] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  /* Fetch products */
  useEffect(() => {
    setLoadingProducts(true);
    fetch("/api/calculator/products")
      .then((r) => r.json())
      .then((data: Product[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          applyProduct(data[0]);
        }
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoadingProducts(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyProduct = useCallback((p: Product) => {
    setSelectedProduct(p);
    const v = p.variants[0];
    if (v) {
      const dims = parseDimensions(v.size);
      if (dims) {
        setThickness(dims.thickness);
        setWidth(dims.width);
        setLength(dims.length);
      }
      const cubePr = v.pricePerCube ? Number(v.pricePerCube) : null;
      const piecePr = v.pricePerPiece ? Number(v.pricePerPiece) : null;
      setPricePerCube(cubePr ?? (piecePr && v.piecesPerCube ? piecePr * Number(v.piecesPerCube) : 15000));
      setPricePerPiece(piecePr);
    }
  }, []);

  /* Calculated values */
  const volumePerPiece = calcVolume(thickness, width, length, 1);
  const areaPerPiece = (width / 1000) * length; // м² одной доски (рабочая ширина × длина)

  const piecesNeeded = mode === "cube"
    ? Math.ceil(cubeNeed / (volumePerPiece || 0.001))
    : mode === "sqm"
    ? Math.ceil(sqmNeed / (areaPerPiece || 0.001))
    : quantity;

  const totalVolume = mode === "cube" ? cubeNeed : volumePerPiece * piecesNeeded;
  const totalArea = areaPerPiece * piecesNeeded;

  // Цена: если есть pricePerPiece — считаем по шт, иначе по м³
  const effectivePricePerPiece = pricePerPiece ?? (volumePerPiece * pricePerCube);
  const totalPrice = pricePerPiece
    ? effectivePricePerPiece * piecesNeeded
    : totalVolume * pricePerCube;

  const piecesPerCubeCalc = volumePerPiece > 0 ? Math.round(1 / volumePerPiece) : 0;

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const v = selectedProduct.variants[0];
    if (!v) return;

    const usePiece = pricePerPiece && (mode === "sqm" || selectedProduct.saleUnit === "PIECE");
    addItem({
      variantId: v.id,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSlug: selectedProduct.slug,
      productImage: selectedProduct.images?.[0],
      variantSize: v.size,
      unitType: usePiece ? "PIECE" : "CUBE",
      quantity: usePiece ? piecesNeeded : parseFloat(totalVolume.toFixed(4)),
      price: usePiece ? pricePerPiece! : pricePerCube,
    });
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      {/* Page header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Главная
            </Link>
            <span>/</span>
            <span className="text-foreground">Калькулятор пиломатериалов</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calculator className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
                Калькулятор пиломатериалов
              </h1>
              <p className="text-muted-foreground mt-1.5 text-base sm:text-lg">
                Рассчитайте точное количество и стоимость за 30 секунд
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* ── Main calculator card ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Mode tabs */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="font-display font-semibold text-lg mb-4">
                Режим расчёта
              </h2>
              <div className="flex rounded-xl bg-muted/60 p-1 gap-1">
                {(["pieces", "cube", "sqm"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all",
                      mode === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m === "pieces" ? "Штуки → м³" : m === "cube" ? "Нужно м³" : "Нужно м²"}
                  </button>
                ))}
              </div>
            </div>

            {/* Product selector */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="font-display font-semibold text-lg mb-4">
                Выбор товара
              </h2>
              {loadingProducts ? (
                <div className="h-11 rounded-xl bg-muted/60 animate-pulse" />
              ) : products.length > 0 ? (
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedProduct?.id ?? ""}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) applyProduct(p);
                  }}
                >
                  <option value="">— Выберите товар из каталога —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.variants[0]?.size ? ` — ${p.variants[0].size}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Введите параметры вручную или{" "}
                  <Link href="/catalog" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    перейдите в каталог
                  </Link>
                </p>
              )}
              {selectedProduct && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Параметры загружены из выбранного товара
                </p>
              )}
            </div>

            {/* Inputs */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="font-display font-semibold text-lg mb-4">
                {mode === "pieces" ? "Размеры и количество" : mode === "cube" ? "Нужный объём" : "Нужная площадь"}
              </h2>

              {mode === "pieces" ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <NumInput
                      label="Толщина"
                      unit="мм"
                      value={thickness}
                      onChange={setThickness}
                      hint="Напр: 50"
                    />
                    <NumInput
                      label="Ширина"
                      unit="мм"
                      value={width}
                      onChange={setWidth}
                      hint="Напр: 150"
                    />
                    <NumInput
                      label="Длина"
                      unit="м"
                      value={length}
                      onChange={setLength}
                      step={0.5}
                      hint="Напр: 6"
                    />
                    <NumInput
                      label="Количество"
                      unit="шт"
                      value={quantity}
                      onChange={setQuantity}
                      hint="Штук"
                    />
                  </div>
                  <NumInput
                    label="Цена за 1 м³"
                    unit="₽"
                    value={pricePerCube}
                    onChange={setPricePerCube}
                    step={500}
                    hint="Из карточки товара"
                  />
                </>
              ) : mode === "cube" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumInput
                    label="Сколько м³ нужно"
                    unit="м³"
                    value={cubeNeed}
                    onChange={setCubeNeed}
                    step={0.1}
                    hint="Введите нужный объём"
                  />
                  <NumInput
                    label="Цена за м³"
                    unit="₽"
                    value={pricePerCube}
                    onChange={setPricePerCube}
                    step={500}
                    hint="Из карточки товара"
                  />
                  <NumInput
                    label="Толщина"
                    unit="мм"
                    value={thickness}
                    onChange={setThickness}
                  />
                  <NumInput
                    label="Ширина"
                    unit="мм"
                    value={width}
                    onChange={setWidth}
                  />
                  <NumInput
                    label="Длина"
                    unit="м"
                    value={length}
                    onChange={setLength}
                    step={0.5}
                  />
                </div>
              ) : (
                /* Режим м² — для вагонки, планкена, блок-хауса, доски пола */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumInput
                    label="Площадь покрытия"
                    unit="м²"
                    value={sqmNeed}
                    onChange={setSqmNeed}
                    step={1}
                    hint="Стены, пол, потолок"
                  />
                  <NumInput
                    label={pricePerPiece ? "Цена за шт" : "Цена за м³"}
                    unit="₽"
                    value={pricePerPiece ?? pricePerCube}
                    onChange={pricePerPiece ? setPricePerPiece : setPricePerCube}
                    step={pricePerPiece ? 10 : 500}
                    hint="Из карточки товара"
                  />
                  <NumInput
                    label="Ширина доски"
                    unit="мм"
                    value={width}
                    onChange={setWidth}
                    hint="Рабочая ширина"
                  />
                  <NumInput
                    label="Длина доски"
                    unit="м"
                    value={length}
                    onChange={setLength}
                    step={0.5}
                  />
                  <NumInput
                    label="Толщина"
                    unit="мм"
                    value={thickness}
                    onChange={setThickness}
                    hint="Для расчёта м³"
                  />
                </div>
              )}
            </div>

            {/* Breakdown table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-display font-semibold text-lg">Расшифровка расчёта</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Параметр
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Значение
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      {
                        label: "Размер",
                        value: `${thickness} × ${width} × ${(length * 1000).toFixed(0)} мм`,
                      },
                      {
                        label: "Объём 1 штуки",
                        value: `${formatVolume(volumePerPiece)} м³`,
                      },
                      {
                        label: "Площадь 1 штуки",
                        value: `${areaPerPiece.toFixed(2)} м²`,
                      },
                      {
                        label: "Штук в 1 м³",
                        value: `~${piecesPerCubeCalc} шт`,
                      },
                      {
                        label: "Количество штук",
                        value: `${piecesNeeded} шт`,
                      },
                      {
                        label: "Итого объём",
                        value: `${formatVolume(totalVolume)} м³`,
                      },
                      {
                        label: "Итого площадь",
                        value: `${totalArea.toFixed(2)} м²`,
                      },
                      ...(pricePerPiece ? [{
                        label: "Цена за шт",
                        value: formatPrice(pricePerPiece),
                      }] : []),
                      {
                        label: "Цена за м³",
                        value: formatPrice(pricePerCube),
                      },
                    ].map((row) => (
                      <tr key={row.label} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                        <td className="px-4 py-3 text-right font-medium">{row.value}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5">
                      <td className="px-4 py-3.5 font-bold text-primary text-base">
                        ИТОГО
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-primary text-base">
                        {formatPrice(totalPrice)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Explanation collapsible */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setShowExplain((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary/70" />
                  <span className="font-semibold">Как считается?</span>
                  <span className="text-muted-foreground font-normal">Формулы расчёта</span>
                </span>
                {showExplain ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {showExplain && (
                <div className="px-5 py-4 border-t border-border bg-muted/10 space-y-4 text-sm">
                  <div>
                    <p className="font-semibold text-foreground mb-1">
                      Объём одной доски (м³):
                    </p>
                    <p className="text-muted-foreground mb-2">
                      Толщина (мм) ÷ 1000 × Ширина (мм) ÷ 1000 × Длина (м)
                    </p>
                    <div className="font-mono text-xs bg-background rounded-xl px-4 py-2.5 border border-border">
                      {thickness}/1000 × {width}/1000 × {length} ={" "}
                      <strong>{formatVolume(volumePerPiece)} м³</strong>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">
                      Штук в одном кубометре:
                    </p>
                    <p className="text-muted-foreground mb-2">
                      1 ÷ Объём 1 штуки
                    </p>
                    <div className="font-mono text-xs bg-background rounded-xl px-4 py-2.5 border border-border">
                      1 ÷ {formatVolume(volumePerPiece)} ≈{" "}
                      <strong>{piecesPerCubeCalc} шт</strong>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">
                      Итоговый объём:
                    </p>
                    <p className="text-muted-foreground mb-2">
                      Объём 1 шт × Количество штук
                    </p>
                    <div className="font-mono text-xs bg-background rounded-xl px-4 py-2.5 border border-border">
                      {formatVolume(volumePerPiece)} × {piecesNeeded} ={" "}
                      <strong>{formatVolume(totalVolume)} м³</strong>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">
                      Стоимость:
                    </p>
                    <p className="text-muted-foreground mb-2">
                      Объём (м³) × Цена за м³
                    </p>
                    <div className="font-mono text-xs bg-background rounded-xl px-4 py-2.5 border border-border">
                      {formatVolume(totalVolume)} × {pricePerCube} ={" "}
                      <strong>{formatPrice(totalPrice)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar: result + add to cart ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Sticky result card */}
            <div className="lg:sticky lg:top-4 space-y-4">
              {/* Big result */}
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Результат
                </p>

                <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 mb-4 text-center">
                  {/* Основной результат зависит от режима */}
                  {mode === "sqm" ? (
                    <>
                      <p className="font-display font-bold text-4xl text-primary leading-none">
                        {piecesNeeded} шт
                      </p>
                      <div className="flex items-center justify-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span>{totalArea.toFixed(1)} м²</span>
                        <span>•</span>
                        <span>{formatVolume(totalVolume)} м³</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-1">
                        {piecesNeeded} шт × {formatVolume(volumePerPiece)} м³
                      </p>
                      <p className="font-display font-bold text-4xl text-primary leading-none">
                        {formatVolume(totalVolume)} м³
                      </p>
                      {totalArea > 0 && (
                        <p className="text-sm text-muted-foreground mt-1.5">
                          ≈ {totalArea.toFixed(1)} м² • {piecesNeeded} шт
                        </p>
                      )}
                    </>
                  )}
                  <div className="my-3 h-px bg-primary/20" />
                  <p className="font-display font-bold text-3xl text-foreground leading-none">
                    {formatPrice(totalPrice)}
                  </p>
                  {pricePerPiece && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPrice(effectivePricePerPiece)} / шт
                    </p>
                  )}
                </div>

                {/* Add to cart button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedProduct}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-base transition-all",
                    added
                      ? "bg-primary/80 text-primary-foreground"
                      : selectedProduct
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 active:scale-98"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {added ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      Добавлено в корзину!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 shrink-0" />
                      Добавить в корзину
                    </>
                  )}
                </button>

                {!selectedProduct && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Выберите товар из каталога чтобы добавить в корзину
                  </p>
                )}
              </div>

              {/* Quick info */}
              <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                <p className="text-sm font-semibold">Полезно знать</p>
                {[
                  {
                    label: "Доска 50×150×6000",
                    hint: "Стандартный размер",
                    value: `~${Math.round(1 / calcVolume(50, 150, 6, 1))} шт/м³`,
                  },
                  {
                    label: "Брус 100×100×6000",
                    hint: "Стандартный размер",
                    value: `~${Math.round(1 / calcVolume(100, 100, 6, 1))} шт/м³`,
                  },
                  {
                    label: "Вагонка 14×96×6000",
                    hint: "Стандартный размер",
                    value: `~${Math.round(1 / calcVolume(14, 96, 6, 1))} шт/м³`,
                  },
                ].map((tip) => (
                  <div
                    key={tip.label}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-xs">{tip.label}</p>
                      <p className="text-muted-foreground text-xs">{tip.hint}</p>
                    </div>
                    <span className="font-semibold text-primary text-xs shrink-0">
                      {tip.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA to catalog */}
              <Link
                href="/catalog"
                className="flex items-center justify-between gap-2 px-5 py-4 bg-card border border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div>
                  <p className="font-semibold text-sm">Смотреть каталог</p>
                  <p className="text-xs text-muted-foreground">Все виды пиломатериалов</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
