"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useCartStore } from "@/store/cart";

export function RepeatOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const router = useRouter();

  async function handleRepeat() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cabinet/repeat-order?orderId=${orderId}`);
      const data = await res.json();
      if (!res.ok || !data.items?.length) {
        alert("Не удалось добавить товары. Возможно, они больше не доступны.");
        return;
      }
      for (const item of data.items) {
        addItem(item);
      }
      setCartOpen(true);
      router.push("/");
    } catch {
      alert("Ошибка при повторении заказа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRepeat}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
    >
      <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Добавляем..." : "Повторить заказ"}
    </button>
  );
}
