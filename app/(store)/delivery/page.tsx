import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle, Truck, MapPin, Clock, FileText, Phone } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { getSiteSettings, getSetting } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Доставка и оплата пиломатериалов — ПилоРус | Москва и МО",
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

export default async function DeliveryPage() {
  const settings = await getSiteSettings();
  const workingHours = getSetting(settings, "working_hours") || "Пн–Пт: 09:00–18:00, Сб: 09:00–15:00";
  return (
    <div className="container py-12">
      <div className="flex items-start gap-3 mb-3">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <h1 className="font-display font-bold text-4xl">Доставка и оплата</h1>
      </div>
      <p className="text-muted-foreground text-lg mb-10">
        Работаем честно — без скрытых наценок на доставку
      </p>

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
          <div key={block.title} className="bg-card rounded-2xl border border-border p-6">
            <div className={`w-12 h-12 ${block.bg} rounded-xl flex items-center justify-center mb-4`}>
              <block.icon className={`w-6 h-6 ${block.color}`} />
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

      {/* FAQ */}
      <div className="bg-muted/30 rounded-2xl p-8 mb-8">
        <h2 className="font-display font-bold text-2xl mb-6">Часто задаваемые вопросы</h2>
        <div className="space-y-4">
          {[
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
          ].map((faq) => (
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
            href="tel:+79859707133"
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 active:scale-95 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-2xl shadow-brand-orange/40"
          >
            <Phone className="w-5 h-5" />
            8-985-970-71-33
          </a>
        </div>
      </div>
    </div>
  );
}
