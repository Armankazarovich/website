"use client";

import { useState } from "react";
import { Handshake, CheckCircle, ArrowRight } from "lucide-react";
import { PartnershipModal } from "@/components/store/partnership-modal";

const PERKS = [
  "Скидка от 5% до 20% на весь объём",
  "Персональный менеджер 24/7",
  "Отсрочка платежа до 30 дней",
  "Приоритетная отгрузка без очереди",
];

export function PartnershipPromoCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-brand-brown text-white p-6 flex flex-col min-h-[260px]">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-brand-orange/10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-brand-orange/5 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shrink-0">
            <Handshake className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-orange">
            Партнёрская программа
          </span>
        </div>

        <h3 className="font-display font-bold text-xl mb-1 leading-tight">
          Специальные условия для бизнеса
        </h3>
        <p className="text-white/60 text-sm mb-4">
          Строители, магазины, подрядчики — оптовые цены от производителя
        </p>

        <ul className="space-y-1.5 mb-5 flex-1">
          {PERKS.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-white/80">
              <CheckCircle className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 w-full bg-brand-orange hover:bg-brand-orange/90 active:scale-[0.98] transition-all text-white font-semibold text-sm py-2.5 rounded-xl"
        >
          Стать партнёром
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {open && <PartnershipModal onClose={() => setOpen(false)} />}
    </>
  );
}
