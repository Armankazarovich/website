"use client";

import { MessageCircle, Route, Sparkles } from "lucide-react";
import { requestArayPrompt } from "@/components/store/aray-events";

type VendorContactActionsProps = {
  sellerName: string;
  sellerUrl: string;
  phone?: string | null;
  specialization?: string | null;
};

function promptFor(sellerName: string, sellerUrl: string, goal: string, specialization?: string | null) {
  return [
    `Помоги оформить запрос продавцу ${sellerName}.`,
    specialization ? `Направление: ${specialization}.` : "",
    `Страница продавца: ${sellerUrl}.`,
    `Задача клиента: ${goal}.`,
    "Спроси объем, размеры, адрес доставки и удобный способ связи.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function VendorContactActions({ sellerName, sellerUrl, phone, specialization }: VendorContactActionsProps) {
  const askSeller = (goal: string) => {
    requestArayPrompt({
      text: promptFor(sellerName, sellerUrl, goal, specialization),
      displayText: goal,
      context: `seller:${sellerName}`,
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => askSeller("Хочу подобрать пиломатериалы и получить предложение.")}
        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <MessageCircle className="h-4 w-4" />
        Написать продавцу
      </button>
      <button
        type="button"
        onClick={() => askSeller("Нужно уточнить наличие, сроки и цену по выбранным позициям.")}
        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
      >
        <Sparkles className="h-4 w-4" />
        Получить предложение
      </button>
      <button
        type="button"
        onClick={() => askSeller("Нужно рассчитать доставку и самовывоз.")}
        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
      >
        <Route className="h-4 w-4" />
        Доставка
      </button>
      {phone ? (
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
          Позвонить
        </a>
      ) : null}
    </div>
  );
}
