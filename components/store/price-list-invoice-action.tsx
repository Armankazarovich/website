"use client";

import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

export function PriceListInvoiceAction({ className }: { className?: string }) {
  const { hydrateCart, items } = useCartStore();
  const itemCount = items.length;
  const href = itemCount > 0 ? "/checkout?invoice=1" : "/cart";

  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  return (
    <Link
      href={href}
      data-price-list-invoice-action
      className={cn(
        "relative inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary",
        className,
      )}
      aria-label={itemCount > 0 ? "Оформить счет по выбранным позициям" : "Открыть корзину для подготовки счета"}
    >
      <ReceiptText className="h-4 w-4 text-primary" />
      <span className="hidden sm:inline">Счёт</span>
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </Link>
  );
}
