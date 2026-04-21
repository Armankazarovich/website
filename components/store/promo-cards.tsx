"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PromoQuoteModal } from "./promo-quote-modal";

type Promotion = {
  id: string;
  title: string;
  description: string;
  validUntil: Date | string | null;
};

interface Props {
  promotions: Promotion[];
}

/* Темы карточек (по индексу) — первая зелёная "Выгода", вторая синяя "Доставка" */
const THEMES = [
  {
    gradient: "from-emerald-950 via-emerald-900 to-teal-800",
    accent: "#10b981",
    circle1: "bg-emerald-400/10",
    circle2: "bg-teal-300/8",
    badgeText: "text-emerald-300",
    label: "Выгода",
    /* Анимированные слои — всплывают по очереди */
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path className="[animation:promoLayer1_2.4s_ease-in-out_infinite]" d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" style={{ transformOrigin: "12px 7px" }} />
        <path className="[animation:promoLayer2_2.4s_ease-in-out_0.3s_infinite]" d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transformOrigin: "12px 14.5px" }} />
        <path className="[animation:promoLayer3_2.4s_ease-in-out_0.6s_infinite]" d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transformOrigin: "12px 19.5px" }} />
      </svg>
    ),
    /* CTA: открывает попап формы расчёта */
    cta: { type: "modal", label: "Рассчитать предложение" } as const,
  },
  {
    gradient: "from-slate-900 via-blue-950 to-indigo-900",
    accent: "#60a5fa",
    circle1: "bg-blue-400/10",
    circle2: "bg-indigo-300/8",
    badgeText: "text-blue-300",
    label: "Доставка",
    /* Грузовик — колёса крутятся */
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M1 4h13v13H1V4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 9h4.5L22 13v4h-8V9z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="5" cy="19" r="2" stroke="white" strokeWidth="1.5" className="[animation:promoSpin_1.8s_linear_infinite]" style={{ transformOrigin: "5px 19px" }} />
        <circle cx="18" cy="19" r="2" stroke="white" strokeWidth="1.5" className="[animation:promoSpin_1.8s_linear_infinite]" style={{ transformOrigin: "18px 19px" }} />
        <circle cx="5" cy="19" r="0.6" fill="white" className="[animation:promoSpin_1.8s_linear_infinite]" style={{ transformOrigin: "5px 19px" }} />
        <circle cx="18" cy="19" r="0.6" fill="white" className="[animation:promoSpin_1.8s_linear_infinite]" style={{ transformOrigin: "18px 19px" }} />
      </svg>
    ),
    /* CTA: ссылка на страницу доставки */
    cta: { type: "link", label: "Подробнее о доставке", href: "/delivery" } as const,
  },
];

export function PromoCards({ promotions }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {promotions.map((promo, i) => {
        const theme = THEMES[i % THEMES.length];
        return (
          <div
            key={promo.id}
            className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${theme.gradient} text-white p-6 flex flex-col min-h-[280px]`}
          >
            {/* Декоративные круги */}
            <div className={`absolute top-0 right-0 w-44 h-44 rounded-full ${theme.circle1} -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
            <div className={`absolute bottom-0 left-0 w-28 h-28 rounded-full ${theme.circle2} translate-y-1/2 -translate-x-1/2 pointer-events-none`} />

            {/* Бейдж с анимированной иконкой */}
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: theme.accent + "25", border: `1px solid ${theme.accent}40` }}
              >
                {theme.icon}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-widest ${theme.badgeText}`}>
                {theme.label}
              </span>
            </div>

            {/* Контент */}
            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="font-display font-bold text-xl mb-2 leading-tight">{promo.title}</h3>
              <p className="text-white/70 text-sm leading-relaxed">{promo.description}</p>

              {/* CTA-кнопка — основной призыв к действию */}
              <div className="mt-5">
                {theme.cta.type === "modal" ? (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-white text-emerald-900 text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
                  >
                    {theme.cta.label}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href={theme.cta.href}
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] border border-white/25 hover:border-white/45 text-white text-sm font-semibold backdrop-blur-sm transition-all shadow-lg"
                  >
                    {theme.cta.label}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {promo.validUntil && (
                <p className="text-xs text-white/40 mt-4 pt-3 border-t border-white/10">
                  Акция до {new Date(promo.validUntil).toLocaleDateString("ru-RU")}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Попап заявки — боковая панель */}
      <PromoQuoteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
