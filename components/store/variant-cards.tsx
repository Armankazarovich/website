"use client";

import { useCartStore } from "@/store/cart";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";

interface Variant {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  piecesPerCube: number | null;
  inStock: boolean;
}

interface VariantCardsProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  saleUnit: string;
  variants: Variant[];
}

export function VariantCards({
  productId,
  productName,
  productSlug,
  productImage,
  saleUnit,
  variants,
}: VariantCardsProps) {
  const addItem = useCartStore((s) => s.addItem);
  const { toast } = useToast();

  const handleAdd = (v: Variant) => {
    if (!v.inStock) return;

    const isPiece = saleUnit === "PIECE";
    const unitType = isPiece ? "PIECE" : "CUBE";
    const price = isPiece
      ? (v.pricePerPiece ?? 0)
      : (v.pricePerCube ?? v.pricePerPiece ?? 0);

    addItem({
      variantId: v.id,
      productId,
      productName,
      productSlug,
      variantSize: v.size,
      productImage,
      unitType,
      quantity: 1,
      price,
    });

    toast({
      title: "Добавлено в корзину",
      description: `${productName} — ${v.size}`,
      duration: 3000,
    });
  };

  const unit = saleUnit === "PIECE" ? "шт" : "м³";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {variants.map((v) => {
        const price = saleUnit === "PIECE"
          ? v.pricePerPiece
          : (v.pricePerCube ?? v.pricePerPiece);

        return (
          <div
            key={v.id}
            onClick={() => handleAdd(v)}
            className={`relative rounded-2xl border p-4 transition-all duration-200 group ${
              v.inStock
                ? "border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md hover:shadow-primary/10 active:scale-95 cursor-pointer"
                : "border-border/40 bg-muted/20 opacity-50 cursor-not-allowed"
            }`}
          >
            {/* Status dot */}
            <div
              className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                v.inStock ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            />

            {/* Size */}
            <p className="font-mono font-semibold text-sm leading-tight mb-3 pr-4">
              {v.size}
            </p>

            {/* Price */}
            {price ? (
              <div>
                <p className="font-bold text-lg text-primary leading-none">
                  {formatPrice(Number(price))} ₽
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">за {unit}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">По запросу</p>
            )}

            {/* Pieces per cube */}
            {v.piecesPerCube && saleUnit !== "PIECE" && (
              <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                {v.piecesPerCube} шт/м³
              </p>
            )}

            {/* Hover cart overlay — only for in-stock */}
            {v.inStock && (
              <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary drop-shadow"
                >
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
