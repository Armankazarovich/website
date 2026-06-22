import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Calculator, CheckCircle, Truck, MapPin, Clock, FileText, Phone } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { getSiteSettings, getSetting } from "@/lib/site-settings";
import { getPrimaryServiceAreas } from "@/lib/store-service-areas";

export const metadata: Metadata = {
  title: "Доставка и оплата пиломатериалов по Москве и МО",
  description: "Доставка пиломатериалов по Москве и МО за 1-3 дня от 2500 руб. Самовывоз со склада в Химках бесплатно. Оплата: наличные, карта, безналичный расчёт для юрлиц.",
  keywords: ["доставка пиломатериалов Москва", "доставка досок МО", "самовывоз пиломатериалы Химки", "оплата пиломатериалы безнал"],
  openGraph: {
    title: "Доставка пиломатериалов по Москве и МО — ПилоРус",
    description: "За 1-3 дня по Москве и области. Самовывоз из Химок бесплатно.",
    url: "https://pilo-rus.ru/delivery",
    type: "website",
  },
  alternates: { canonical: "https://pilo-rus.ru/delivery" },
};

const deliveryFaqs = [
  {
    q: "Как рассчитывается стоимость доставки?",
    a: "Стоимость зависит от объёма заказа и адреса доставки. Менеджер рассчитает точную стоимость после подтверждения заказа.",
  },
  {
    q: "Можно ли заказать доставку в другой регион?",
    a: "Базово работаем по Москве и МО. По вопросам доставки в другие регионы — свяжитесь с менеджером.",
  },
  {
    q: "Можно ли заказать разгрузку?",
    a: "Да, возможна помощь с разгрузкой. Уточните этот вопрос при оформлении заказа.",
  },
  {
    q: "Как оформить безналичную оплату?",
    a: "После согласования заказа выставим счёт с реквизитами. Отгрузка — после поступления оплаты.",
  },
];

export default async function DeliveryPage() {
  const settings = await getSiteSettings();
  const workingHours = getSetting(settings, "working_hours") || "Пн–Пт: 09:00–18:00, Сб: 09:00–15:00";
  const phone = getSetting(settings, "phone");
  const phoneLink = getSetting(settings, "phone_link");
  const serviceAreas = getPrimaryServiceAreas(24);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": deliveryFaqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a,
      },
    })),
  };

  return (
    <div className="container py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="flex items-start gap-3 mb-3">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <h1 className="font-display font-bold text-3xl leading-tight sm:text-4xl">Доставка и оплата</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground text-base leading-relaxed sm:text-lg">
        Работаем честно — без скрытых наценок на доставку
      </p>

      <div className="my-6 grid gap-3 sm:my-8 sm:max-w-xl sm:grid-cols-2">
        <Link
          href="/calculator"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98]"
        >
          Рассчитать доставку
          <Calculator className="h-4 w-4" />
        </Link>
        <a
          href={`tel:${phoneLink}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-5 text-sm font-semibold transition hover:border-primary/50 hover:text-primary active:scale-[0.98]"
        >
          <Phone className="h-4 w-4" />
          Позвонить менеджеру
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {[
          {
            icon: Truck,
            title: "Доставка",
            color: "text-brand-orange",
            bg: "bg-brand-orange/10",
            items: [
              "По Москве и Московской области",
              "Срок: 1-3 рабочих дня",
              "Собственный автопарк",
              "Стоимость рассчитывается индивидуально",
              "Возможна разгрузка",
            ],
          },
          {
            icon: MapPin,
            title: "Самовывоз",
            color: "text-brand-green",
            bg: "bg-brand-green/10",
            items: [
              "Химки, Заводская 2А, стр.28",
              "Бесплатно",
              `Режим: ${workingHours}`,
              "Есть погрузчик на месте",
              "Предзвоните для резервирования",
            ],
          },
          {
            icon: FileText,
            title: "Оплата",
            color: "text-blue-600",
            bg: "bg-blue-100",
            items: [
              "Наличными при получении",
              "Безналичный расчёт (ИП/ООО)",
              "Счёт с реквизитами по запросу",
              "Документы: накладная, счёт-фактура",
              "НДС включён в стоимость",
            ],
          },
        ].map((block) => (
          <div key={block.title} className="store-feature-card bg-card rounded-2xl border border-border p-6">
            <div className="store-icon-tile w-12 h-12 rounded-xl mb-4">
              <block.icon className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl mb-4">{block.title}</h3>
            <ul className="space-y-2">
              {block.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="store-landing-band mb-12 rounded-2xl border p-5 sm:p-6">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="font-display font-bold text-2xl">Как проходит заказ</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Понятный маршрут от заявки до отгрузки: фиксируем детали, считаем стоимость,
              согласуем дату и передаем документы вместе с заказом.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
            <Link
              href="/calculator"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Рассчитать заказ
              <Calculator className="h-4 w-4" />
            </Link>
            <a
              href={`tel:${phoneLink}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background/45 px-4 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
            >
              <Phone className="h-4 w-4" />
              Позвонить
            </a>
          </div>
        </div>

        <div className="relative grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="pointer-events-none absolute left-8 right-8 top-7 z-0 hidden h-px bg-primary/25 md:block" />
          {[
            { icon: Phone, title: "Заявка", text: "Адрес, объем, удобное время и формат получения." },
            { icon: Calculator, title: "Расчет", text: "Материал, доставка, разгрузка и итоговая сумма." },
            { icon: Clock, title: "Согласование", text: "Дата, оплата, резерв товара и документы." },
            { icon: Truck, title: "Отгрузка", text: "Привозим заказ и передаем закрывающие документы." },
          ].map((step, index) => (
            <div
              key={step.title}
              className="relative z-10 rounded-xl border border-border/75 bg-card p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="store-icon-tile h-11 w-11 rounded-xl">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                  0{index + 1}
                </span>
              </div>
              <h3 className="font-semibold leading-tight">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mb-12 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold">Доставка по Москве и городам МО</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Отгружаем со склада в Химках. Для каждого направления считаем маршрут, объем, разгрузку и дату отдельно.
            </p>
          </div>
          <Link
            href="/catalog"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:border-primary/45 hover:text-primary"
          >
            Смотреть каталог
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {serviceAreas.map((area) => (
            <Link
              key={area.slug}
              href={`/delivery/${area.slug}`}
              className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/45"
            >
              <span className="block text-sm font-semibold">{area.name}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {area.deliveryWindow} · {area.distanceKm} км
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <div className="bg-muted/30 rounded-2xl p-8 mb-8">
        <h2 className="font-display font-bold text-2xl mb-6">Часто задаваемые вопросы</h2>
        <div className="space-y-4">
          {deliveryFaqs.map((faq) => (
            <details key={faq.q} className="group bg-card rounded-xl border border-border overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer font-medium">
                {faq.q}
                <span className="text-primary text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* CTA — фото-фон */}
      <div className="relative rounded-2xl overflow-hidden text-white text-center">
        <Image
          src="/images/production/hero-cta.jpg"
          alt="Склад пиломатериалов ПилоРус"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 px-8 py-14">
          <h2 className="font-display font-bold text-3xl mb-3">Остались вопросы?</h2>
          <p className="text-white/75 mb-8 text-lg">Наши менеджеры на связи {workingHours}</p>
          <a
            href={`tel:${phoneLink}`}
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 active:scale-95 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-2xl shadow-brand-orange/40"
          >
            <Phone className="w-5 h-5" />
            {phone}
          </a>
        </div>
      </div>
    </div>
  );
}
