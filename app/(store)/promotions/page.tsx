import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Handshake, PackageCheck, PhoneCall, Tag, Truck } from "lucide-react";
import { PartnershipPromoCard } from "@/components/store/partnership-promo-card";
import { PromoCards } from "@/components/store/promo-cards";
import { BackButton } from "@/components/ui/back-button";
import { prisma } from "@/lib/prisma";
import { getSetting, getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Акции и скидки",
  description: "Актуальные акции и скидки на пиломатериалы от ПилоРус",
  keywords: ["акции на пиломатериалы", "скидки на доску", "оптовые условия пиломатериалы", "ПилоРус акции"],
  openGraph: {
    title: "Акции и скидки на пиломатериалы — ПилоРус",
    description: "Партнерские условия, скидки на объем и индивидуальный расчет заказа.",
    url: "https://pilo-rus.ru/promotions",
    type: "website",
  },
  alternates: { canonical: "https://pilo-rus.ru/promotions" },
};

const BENEFITS = [
  {
    icon: Handshake,
    title: "Для бизнеса",
    text: "Оптовые условия, персональный менеджер и приоритетная отгрузка.",
  },
  {
    icon: PackageCheck,
    title: "Для крупных заказов",
    text: "Скидки обсуждаем по объему, размеру и составу партии.",
  },
  {
    icon: Truck,
    title: "С доставкой",
    text: "Поможем посчитать материал, логистику и разгрузку.",
  },
];

export default async function PromotionsPage() {
  const [promotions, settings] = await Promise.all([
    prisma.promotion.findMany({
      where: {
        active: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
    }),
    getSiteSettings(),
  ]);

  const phoneLink = getSetting(settings, "phone_link");
  const managerHref = phoneLink
    ? phoneLink.startsWith("tel:")
      ? phoneLink
      : `tel:${phoneLink}`
    : "/contacts";
  const promoCards = promotions.map((promo) => ({
    id: promo.id,
    title: promo.title,
    description: promo.description,
    validUntil: promo.validUntil,
  }));

  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-7 flex items-start gap-3 sm:mb-9">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
            ПилоРус для выгодной закупки
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            Акции и скидки
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Собрали предложения, которые реально помогают снизить стоимость заказа:
            партнерские условия, скидки на объем и индивидуальный расчет под объект.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <PartnershipPromoCard />
        <PromoCards promotions={promoCards} phoneLink={phoneLink} />

        {promotions.length === 0 && (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
            <Tag className="mx-auto mb-3 h-10 w-10 opacity-25" />
            <p className="text-base font-medium text-foreground">Актуальных акций пока нет</p>
            <p className="mt-1 text-sm">
              Индивидуальные условия можно обсудить с менеджером.
            </p>
          </div>
        )}
      </div>

      <div className="store-landing-band mt-8 grid gap-5 rounded-2xl border p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-4">
          <div className="store-icon-tile h-12 w-12 shrink-0 rounded-xl">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Индивидуальный расчет
            </p>
            <h2 className="mt-1 font-display text-xl font-bold leading-tight sm:text-2xl">
              Получить предложение под ваш заказ
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Если объем большой или нужны разные позиции, отправьте расчет. Подберем размеры,
              посчитаем доставку и предложим лучшую цену по партии.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-[430px]">
          <Link
            href="/calculator"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Рассчитать заказ
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={managerHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/40 px-4 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
          >
            <PhoneCall className="h-4 w-4" />
            Связаться с менеджером
          </a>
        </div>
      </div>

      <div className="store-landing-band mt-8 rounded-2xl border p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {BENEFITS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="store-icon-tile h-10 w-10 shrink-0 rounded-xl">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold leading-tight">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
