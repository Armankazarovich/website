"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Layers3,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { PromoQuoteModal } from "./promo-quote-modal";
import { AdminEditButton } from "@/components/admin/admin-edit-button";
import { getPublicEditTarget } from "@/lib/public-edit-targets";

export type PromotionCardData = {
  id: string;
  title: string;
  description: string;
  validUntil: Date | string | null;
};

interface Props {
  promotions: PromotionCardData[];
  phoneLink?: string;
}

type Theme = {
  cardClass: string;
  iconClass: string;
  circle1: string;
  circle2: string;
  badgeText: string;
  label: string;
  Icon: LucideIcon;
  cta:
    | { type: "modal"; label: string }
    | { type: "link"; label: string; href: string };
};

const THEMES: Theme[] = [
  {
    cardClass: "border-primary/20 bg-primary/10",
    iconClass: "border-primary/25 bg-primary/10 text-primary",
    circle1: "bg-primary/[0.06]",
    circle2: "bg-primary/[0.04]",
    badgeText: "text-primary",
    label: "Выгода",
    Icon: Layers3,
    cta: { type: "modal", label: "Рассчитать предложение" },
  },
  {
    cardClass: "border-border bg-card",
    iconClass: "border-border bg-muted text-foreground",
    circle1: "bg-muted/70",
    circle2: "bg-primary/[0.04]",
    badgeText: "text-muted-foreground",
    label: "Доставка",
    Icon: Truck,
    cta: { type: "link", label: "Подробнее о доставке", href: "/delivery" },
  },
  {
    cardClass: "border-primary/25 bg-primary/[0.08]",
    iconClass: "border-primary/30 bg-primary/10 text-primary",
    circle1: "bg-primary/[0.07]",
    circle2: "bg-muted/60",
    badgeText: "text-primary",
    label: "Спецпредложение",
    Icon: Sparkles,
    cta: { type: "modal", label: "Получить условия" },
  },
  {
    cardClass: "border-border bg-background/70",
    iconClass: "border-primary/20 bg-primary/[0.06] text-primary",
    circle1: "bg-muted/70",
    circle2: "bg-primary/[0.04]",
    badgeText: "text-muted-foreground",
    label: "Гарантия",
    Icon: ShieldCheck,
    cta: { type: "modal", label: "Обсудить заказ" },
  },
];

export function PromoCards({ promotions, phoneLink }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const promotionsEditTarget = getPublicEditTarget("marketing.promotions");

  return (
    <>
      {promotions.map((promo, i) => {
        const theme = THEMES[i % THEMES.length];
        const Icon = theme.Icon;

        return (
          <div
            key={promo.id}
            className={`group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border ${theme.cardClass} p-6 text-foreground`}
          >
            <AdminEditButton href={promotionsEditTarget.adminHref} mode="overlay" label={promotionsEditTarget.adminLabel} />
            <div className={`pointer-events-none absolute right-0 top-0 h-44 w-44 translate-x-1/2 -translate-y-1/2 rounded-full ${theme.circle1}`} />
            <div className={`pointer-events-none absolute bottom-0 left-0 h-28 w-28 -translate-x-1/2 translate-y-1/2 rounded-full ${theme.circle2}`} />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/[0.05]" />

            <div className="relative z-10 mb-4 flex items-center gap-2">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${theme.iconClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs font-semibold uppercase tracking-widest ${theme.badgeText}`}>
                {theme.label}
              </span>
            </div>

            <div className="relative z-10 flex flex-1 flex-col">
              <h3 className="mb-2 font-display text-xl font-bold leading-tight">{promo.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{promo.description}</p>

              <div className="mt-5">
                {theme.cta.type === "modal" ? (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {theme.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    href={theme.cta.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition hover:border-primary/45 hover:bg-primary/15"
                  >
                    {theme.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {promo.validUntil && (
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  Акция до {new Date(promo.validUntil).toLocaleDateString("ru-RU")}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <PromoQuoteModal open={modalOpen} onClose={() => setModalOpen(false)} phoneLink={phoneLink} />
    </>
  );
}
