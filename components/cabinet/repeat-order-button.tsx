"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat2, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/cart";

export function RepeatOrderButton({
  orderId,
  variant = "inline",
}: {
  orderId: string;
  variant?: "inline" | "button";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const router = useRouter();

  async function handleRepeat() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cabinet/repeat-order?orderId=${orderId}`);
      const data = await res.json();
      if (!res.ok || !data.items?.length) {
        setError(data?.error || "Товары больше не доступны");
        setLoading(false);
        return;
      }
      for (const item of data.items) {
        addItem(item);
      }
      setCartOpen(true);
      router.push("/cart");
    } catch {
      setError("Ошибка сети");
      setLoading(false);
    }
  }

  if (variant === "button") {
    return (
      <>
        <button
          onClick={handleRepeat}
          disabled={loading}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          <Repeat2 className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Добавляем…" : "Повторить"}
        </button>
        {error && <span className="text-xs text-destructive w-full">{error}</span>}
      </>
    );
  }

  return (
    <button
      onClick={handleRepeat}
      disabled={loading}
      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Repeat2 className="w-3.5 h-3.5" />}
      {loading ? "Добавляем…" : "Повторить"}
    </button>
  );
}
