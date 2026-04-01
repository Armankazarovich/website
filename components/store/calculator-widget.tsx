"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart, ChevronDown, ChevronUp, Calculator, Info } from "lucide-react";
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

function calcVolume(
  thickness: number,
  width: number,
  length: number,
  qty: number
) {
  return (thickness / 1000) * (width / 1000) * length * qty;
}

function formatVolume(v: number) {
  if (v === 0) return "0";
  if (v < 0.001) return v.toFixed(6);
  if (v < 0.1) return v.toFixed(4);
  return v.toFixed(4).replace(/\.?0+$/, "") || "0";
}

/* ── Input component ────────────────────────────────── */
function NumInput({
  label,
  unit,
  value,
  onChange,
  min = 0.001,
  step = 1,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
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
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main widget ────────────────────────────────────── */
export function CalculatorWidget({ compact = false }: { compact?: boolean }) {
  const { addItem, setCartOpen } = useCartStore();

  /* Dimension state */
  const [thickness, setThickness] = useState(50);
  const [width, setWidth] = useState(150);
  const [length, setLength] = useState(6);
  const [quantity, setQuantity] = useState(10);
  const [pricePerCube, setPricePerCube] = useState(15000);
  const [cubeNeed, setCubeNeed] = useState(1);

  /* Mode & UI state */
  const [mode, setMode] = useState<"pieces" | "cube">("pieces");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [added, setAdded] = useState(false);

  /* Fetch products */
  useEffect(() => {
    fetch("/api/calculator/products")
      .then((r) => r.json())
      .then((data: Product[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          /* Auto-select first product */
          const first = data[0];
          applyProduct(first);
        }
      })
      .catch(() => {/* silently ignore, use defaults */});
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
      const price = v.pricePerCube ? Number(v.pricePerCube) : 15000;
      setPricePerCube(price);
    }
  }, []);

  /* Calculated values */
  const volumePerPiece = calcVolume(thickness, width, length, 1);
  const totalVolume = mode === "pieces"
    ? volumePerPiece * quantity
    : cubeNeed;
  const totalPrice = totalVolume * pricePerCube;
  const piecesNeeded = mode === "cube"
    ? Math.ceil(cubeNeed / volumePerPiece)
    : quantity;
  const piecesPerCubeCalc = volumePerPiece > 0
    ? Math.round(1 / volumePerPiece)
    : 0;

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const v = selectedProduct.variants[0];
    if (!v) return;

    addItem({
      variantId: v.id,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSlug: selectedProduct.slug,
      variantSize: v.size,
      unitType: "CUBE",
      quantity: parseFloat(totalVolume.toFixed(4)),
      price: pricePerCube,
    });
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  /* ─── Compact layout ──────────────────────────────── */
  if (compact) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-bold text-base">Калькулятор</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumInput label="Толщина" unit="мм" value={thickness} onChange={setThickness} />
          <NumInput label="Ширина" unit="мм" value={width} onChange={setWidth} />
          <NumInput label="Длина" unit="м" value={length} onChange={setLength} step={0.5} />
          <NumInput label="Количество" unit="шт" value={quantity} onChange={setQuantity} />
        </div>

        {/* Result */}
        <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5 mb-3">
          <p className="text-xs text-muted-foreground mb-0.5">Итого</p>
          <p className="font-display font-bold text-lg text-primary leading-none">
            {formatVolume(totalVolume)} м³
          </p>
          <p className="text-sm font-semibold mt-1">
            {formatPrice(totalPrice)}
          </p>
        </div>

        <Link
          href="/calculator"
          className="block w-full text-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Открыть полный калькулятор
        </Link>
      </div>
    );
  }

  /* ─── Full layout ─────────────────────────────────── */
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl leading-tight">
            Калькулятор пиломатериалов
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Рассчитайте точное количество и стоимость
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Mode tabs */}
        <div className="flex rounded-xl bg-muted/60 p-1 gap-1">
          {(["pieces", "cube"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "pieces" ? "По размерам (шт)" : "Мне нужно м³"}
            </button>
          ))}
        </div>

        {/* Product selector */}
        {products.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Выбрать из каталога
            </label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedProduct?.id ?? ""}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value);
                if (p) applyProduct(p);
              }}
            >
              <option value="">— Выберите товар —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.variants[0]?.size ? ` (${p.variants[0].size})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Inputs */}
        {mode === "pieces" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <NumInput
              label="Количество"
              unit="шт"
              value={quantity}
              onChange={setQuantity}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumInput
              label="Сколько нужно"
              unit="м³"
              value={cubeNeed}
              onChange={setCubeNeed}
              step={0.1}
            />
            <NumInput
              label="Цена за м³"
              unit="₽"
              value={pricePerCube}
              onChange={setPricePerCube}
              step={500}
            />
          </div>
        )}

        {/* Price per cube (in pieces mode) */}
        {mode === "pieces" && (
          <NumInput
            label="Цена за 1 м³"
            unit="₽"
            value={pricePerCube}
            onChange={setPricePerCube}
            step={500}
          />
        )}

        {/* Result card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-primary/5 to-transparent border border-primary/20 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Результат</p>
              <p className="font-display font-bold text-3xl text-primary leading-none">
                {mode === "pieces"
                  ? `${quantity} шт = ${formatVolume(totalVolume)} м³`
                  : `${piecesNeeded} шт = ${formatVolume(totalVolume)} м³`}
              </p>
              <p className="text-2xl font-bold mt-2 text-foreground">
                {formatPrice(totalPrice)}
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!selectedProduct}
              className={cn(
                "shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all",
                added
                  ? "bg-green-600 text-white"
                  : selectedProduct
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <ShoppingCart className="w-5 h-5 shrink-0" />
              {added ? "Добавлено!" : "В корзину"}
            </button>
          </div>
        </div>

        {/* Breakdown table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Параметр</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Значение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Размер доски</td>
                <td className="px-3 py-2 text-right font-medium">
                  {thickness}×{width}×{(length * 1000).toFixed(0)} мм
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Объём 1 штуки</td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatVolume(volumePerPiece)} м³
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Штук в кубе</td>
                <td className="px-3 py-2 text-right font-medium">
                  ~{piecesPerCubeCalc} шт
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Количество</td>
                <td className="px-3 py-2 text-right font-medium">
                  {mode === "pieces" ? `${quantity} шт` : `${piecesNeeded} шт`}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Итого объём</td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatVolume(totalVolume)} м³
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Цена за м³</td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatPrice(pricePerCube)}
                </td>
              </tr>
              <tr className="bg-primary/5 font-semibold">
                <td className="px-3 py-2.5 text-primary">Итого стоимость</td>
                <td className="px-3 py-2.5 text-right text-primary">
                  {formatPrice(totalPrice)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Collapsible explanation */}
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setShowExplain((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4 text-primary/70" />
              Как считается?
            </span>
            {showExplain ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showExplain && (
            <div className="px-4 py-3 border-t border-border bg-muted/20 text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Объём одной доски (м³):</strong>
                <br />
                Толщина (мм) ÷ 1000 × Ширина (мм) ÷ 1000 × Длина (м)
              </p>
              <p className="font-mono text-xs bg-background rounded-lg px-3 py-2 border border-border">
                {thickness}/1000 × {width}/1000 × {length} = {formatVolume(volumePerPiece)} м³
              </p>
              <p>
                <strong className="text-foreground">Итоговый объём:</strong>
                <br />
                Объём 1 шт × Количество штук
              </p>
              <p className="font-mono text-xs bg-background rounded-lg px-3 py-2 border border-border">
                {formatVolume(volumePerPiece)} × {mode === "pieces" ? quantity : piecesNeeded} = {formatVolume(totalVolume)} м³
              </p>
              <p>
                <strong className="text-foreground">Стоимость:</strong>
                <br />
                Объём (м³) × Цена за м³
              </p>
              <p className="font-mono text-xs bg-background rounded-lg px-3 py-2 border border-border">
                {formatVolume(totalVolume)} м³ × {formatPrice(pricePerCube)} = {formatPrice(totalPrice)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
