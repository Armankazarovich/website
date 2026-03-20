"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { WishlistButton } from "@/components/store/wishlist-button";

interface Variant {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  piecesPerCube: number | null;
  inStock: boolean;
}

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  category: string;
  images: string[];
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  variants: Variant[];
  featured?: boolean;
}

/* Градиент-заглушка когда нет фото */
const FALLBACK_GRADIENT =
  "bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-brand-brown/80";

export function ProductCard({
  id, slug, name, category, images, saleUnit, variants, featured,
}: ProductCardProps) {
  const { addItem, setCartOpen } = useCartStore();
  const { toast } = useToast();

  const activeVariants = variants.filter((v) => v.inStock);
  const firstVariant = activeVariants[0] || variants[0];
  const hasStock = activeVariants.length > 0;

  const minPrice = variants.reduce((min, v) => {
    const p = saleUnit === "PIECE" ? v.pricePerPiece : (v.pricePerCube ?? v.pricePerPiece);
    return p && p < min ? p : min;
  }, Infinity);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!firstVariant || !hasStock) return;
    const unitType = saleUnit === "PIECE" ? "PIECE" : "CUBE";
    const price = unitType === "CUBE" ? firstVariant.pricePerCube : firstVariant.pricePerPiece;
    if (!price) return;

    addItem({
      variantId: firstVariant.id,
      productId: id,
      productName: name,
      productSlug: slug,
      variantSize: firstVariant.size,
      productImage: images[0],
      unitType,
      quantity: 1,
      price: Number(price),
    });

    toast({
      title: "✓ Добавлено в корзину",
      description: `${name} · ${firstVariant.size}`,
      duration: 3000,
      action: (
        <button
          onClick={() => setCartOpen(true)}
          className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          Открыть
        </button>
      ),
    } as any);
  };

  /* Показываем первые 3 размера + счётчик остальных */
  const shownSizes = variants.slice(0, 3);
  const extraCount = variants.length - shownSizes.length;

  return (
    <div className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:shadow-black/8 hover:-translate-y-0.5 hover:border-primary/25 transition-all duration-300">

      {/* ── Изображение ── */}
      <Link href={`/product/${slug}`} className="block relative aspect-[4/3] overflow-hidden">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={name}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
            sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 280px"
          />
        ) : (
          /* Красивый градиент если нет фото */
          <div className={`absolute inset-0 ${FALLBACK_GRADIENT} flex items-center justify-center`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-white/20">
              <rect x="2" y="8" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="13" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="3" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="18" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        )}

        {/* Wishlist button — top right of image */}
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton
            size="sm"
            item={{
              id,
              slug,
              name,
              category,
              images,
              saleUnit,
              variants,
            }}
          />
        </div>

        {/* Верхние бейджи */}
        <div className="absolute top-2.5 left-2.5 right-12 flex items-start justify-between pointer-events-none">
          {/* Хит продаж */}
          {featured && (
            <span className="inline-flex items-center gap-1.5 bg-brand-orange text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg uppercase tracking-wide">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C10 6 6 8 6 12.5C6 16.6 8.9 20 12 20C15.1 20 18 16.6 18 12.5C18 10 16.5 8 15 6.5C15 8 14.3 9.5 13 10.5C13.5 8.5 12 4 12 2Z"/>
              </svg>
              Хит
            </span>
          )}
          {/* Статус наличия */}
          <span className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg shadow-lg backdrop-blur-sm ${
            hasStock
              ? "bg-emerald-500/85 text-white"
              : "bg-black/50 text-white/70"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasStock ? "bg-white animate-pulse" : "bg-white/40"}`} />
            {hasStock ? "В наличии" : "Нет"}
          </span>
        </div>

        {/* Hover overlay с кнопкой "Подробнее" */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
          <span className="bg-white/95 dark:bg-neutral-900/95 text-foreground text-xs font-semibold px-4 py-2 rounded-xl shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            Подробнее →
          </span>
        </div>
      </Link>

      {/* ── Контент ── */}
      <div className="p-4">
        {/* Категория */}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">{category}</p>

        {/* Название */}
        <Link href={`/product/${slug}`}>
          <h3 className="font-display font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2 mb-3">
            {name}
          </h3>
        </Link>

        {/* Размеры-пилюли */}
        {variants.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {shownSizes.map((v) => (
              <span
                key={v.id}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-colors ${
                  v.inStock
                    ? "border-border bg-muted text-foreground/70"
                    : "border-border/40 bg-transparent text-muted-foreground/40 line-through"
                }`}
              >
                {v.size}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary">
                +{extraCount}
              </span>
            )}
          </div>
        )}

        {/* Цена + кнопка */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
          <div>
            {minPrice !== Infinity ? (
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-muted-foreground">от</span>
                <span className="font-display font-bold text-lg text-primary leading-none">
                  {formatPrice(minPrice)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  / {saleUnit === "PIECE" ? "шт" : "м³"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Уточняйте</span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={!hasStock}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-200 shrink-0 ${
              hasStock
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-sm hover:shadow-md"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">В корзину</span>
          </button>
        </div>
      </div>
    </div>
  );
}
