"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore();

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">
              Корзина
              {items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({items.length} {items.length === 1 ? "позиция" : "позиций"})
                </span>
              )}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <ShoppingCart className="w-16 h-16 text-muted-foreground/30" />
              <div>
                <p className="font-medium text-lg">Корзина пуста</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Выберите товары из каталога
                </p>
              </div>
              <Button onClick={onClose} asChild>
                <Link href="/catalog">Перейти в каталог</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
                >
                  {/* Image */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        🪵
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="font-medium text-sm hover:text-primary transition-colors line-clamp-1"
                      onClick={onClose}
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.variantSize} · {item.unitType === "CUBE" ? "м³" : "шт"}
                    </p>
                    <p className="text-xs font-medium text-primary mt-0.5">
                      {formatPrice(item.price)} / {item.unitType === "CUBE" ? "м³" : "шт"}
                    </p>

                    {/* Quantity control */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, parseFloat((item.quantity - (item.unitType === "CUBE" ? 0.1 : 1)).toFixed(1)))}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-12 text-center text-sm font-medium">
                          {item.unitType === "CUBE"
                            ? item.quantity.toFixed(1)
                            : item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, parseFloat((item.quantity + (item.unitType === "CUBE" ? 0.1 : 1)).toFixed(1)))}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border bg-background space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Итого:</span>
              <span className="text-2xl font-display font-bold text-primary">
                {formatPrice(totalPrice())}
              </span>
            </div>
            <Button className="w-full" size="lg" asChild onClick={onClose}>
              <Link href="/checkout">Оформить заказ</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose} asChild>
              <Link href="/cart">Посмотреть корзину</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
