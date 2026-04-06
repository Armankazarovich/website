import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Paintbrush,
  Scissors,
  Truck,
  Layers,
  Wrench,
  Phone,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Услуги | ПилоРус",
  description:
    "Дополнительные услуги от ПилоРус: покраска и антисептирование, распил в размер, доставка по МО, строгание и шлифовка пиломатериалов.",
  alternates: { canonical: "https://pilo-rus.ru/services" },
  openGraph: {
    title: "Услуги | ПилоРус",
    description: "Услуги по обработке и доставке пиломатериалов от производителя ПилоРус",
    url: "https://pilo-rus.ru/services",
  },
};

const ICON_MAP: Record<string, LucideIcon> = {
  Paintbrush,
  Scissors,
  Truck,
  Layers,
  Wrench,
};

function ServiceIcon({ name }: { name: string | null }) {
  const Icon = name ? (ICON_MAP[name] ?? Wrench) : Wrench;
  return <Icon className="w-6 h-6" />;
}

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const whatsappNumber = "+79859707133";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Здравствуйте! Меня интересуют ваши услуги.")}`;

  return (
    <div className="container py-10 md:py-14">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-primary mb-3">
          <Wrench className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Что мы предлагаем</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
          Дополнительные услуги
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Обработка, распил, доставка и другие услуги — всё на одном производстве в Химках
        </p>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Услуги скоро появятся</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex flex-col bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
            >
              {/* Icon + title */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
                  <ServiceIcon name={service.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-semibold text-lg leading-tight mb-1">
                    {service.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              </div>

              {/* Content (HTML) */}
              <div
                className="text-sm text-foreground/80 leading-relaxed mb-5 flex-1
                  [&_ul]:list-none [&_ul]:space-y-1.5 [&_ul]:my-3
                  [&_li]:flex [&_li]:items-start [&_li]:gap-2
                  [&_li]:before:content-['—'] [&_li]:before:text-primary [&_li]:before:shrink-0 [&_li]:before:mt-px
                  [&_p]:mb-3"
                dangerouslySetInnerHTML={{ __html: service.content }}
              />

              {/* Price + CTA */}
              <div className="flex items-center justify-between pt-4 border-t border-border gap-3 flex-wrap">
                <div>
                  {service.price && (
                    <p className="font-display font-bold text-xl text-primary">
                      {service.price}
                    </p>
                  )}
                  {service.unit && (
                    <p className="text-xs text-muted-foreground">{service.unit}</p>
                  )}
                  {!service.price && (
                    <p className="text-sm font-medium text-muted-foreground">Цена по запросу</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                  <Link
                    href="/contacts"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
                  >
                    Контакты
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15 rounded-2xl p-8 text-center">
        <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
        <h2 className="font-display font-bold text-xl mb-2">Нужна другая услуга?</h2>
        <p className="text-muted-foreground mb-5 max-w-md mx-auto">
          Свяжитесь с нами — обсудим ваши задачи и подберём оптимальное решение
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/contacts"
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Написать нам
          </Link>
          <a
            href="tel:+79859707133"
            className="px-6 py-2.5 rounded-xl border border-border bg-card font-semibold text-sm hover:bg-accent transition-colors"
          >
            Позвонить
          </a>
        </div>
      </div>
    </div>
  );
}
