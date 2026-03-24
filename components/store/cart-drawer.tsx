"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingCart, Minus, Plus, Trash2, Package, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { cartOpen, setCartOpen, items, removeItem, updateQuantity, totalPrice, totalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const total = totalPrice();
  const count = totalItems();

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end" onClick={() => setCartOpen(false)}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="relative w-[92vw] max-w-[420px] h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg leading-none">Корзина</h3>
                  {count > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "товар" : count < 5 ? "товара" : "товаров"}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                aria-label="Закрыть корзину"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center pb-20">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <ShoppingCart className="w-9 h-9 text-muted-foreground/40" />
                  </div>
                  <p className="font-display font-semibold text-lg mb-1">Корзина пуста</p>
                  <p className="text-muted-foreground text-sm mb-6">Добавьте товары из каталога</p>
                  <Link
                    href="/catalog"
                    onClick={() => setCartOpen(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
                  >
                    Перейти в каталог
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3 px-4 py-4">
                      {/* Image */}
                      <Link
                        href={`/product/${item.productSlug}`}
                        onClick={() => setCartOpen(false)}
                        className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 hover:opacity-80 transition-opacity"
                      >
                        {item.productImage ? (
                          <Image
                            src={item.productImage} alt={item.productName}
                            fill className="object-cover" sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-7 h-7 text-muted-foreground/40" />
                          </div>
                        )}
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${item.productSlug}`}
                          onClick={() => setCartOpen(false)}
                          className="font-medium text-sm leading-tight line-clamp-2 hover:text-primary transition-colors block mb-0.5"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-xs text-muted-foreground mb-2">{item.variantSize}</p>

                        {/* Controls row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.id, parseFloat((item.quantity - (item.unitType === "CUBE" ? 0.1 : 1)).toFixed(1)))}
                              className="w-7 h-7 rounded-md hover:bg-background flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-semibold min-w-[30px] text-center">
                              {item.unitType === "CUBE" ? item.quantity.toFixed(1) : item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, parseFloat((item.quantity + (item.unitType === "CUBE" ? 0.1 : 1)).toFixed(1)))}
                              className="w-7 h-7 rounded-md hover:bg-background flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-primary">{formatPrice(item.price * item.quantity)}</p>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-7 h-7 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors text-muted-foreground"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
              <div className="border-t border-border px-5 pb-8 pt-4 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Итого</span>
                  <span className="font-display font-bold text-xl text-primary">{formatPrice(total)}</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 rounded-xl transition-colors"
                >
                  Оформить заказ
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setCartOpen(false)}
                  className="w-full flex items-center justify-center border border-border hover:bg-muted py-2.5 rounded-xl transition-colors text-sm text-muted-foreground hover:text-foreground font-medium"
                >
                  Подробная корзина →
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
