import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, CheckCircle, Clock, MapPin, PackageSearch, Phone, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getManagedProductTypes, getProductTypeSettings } from "@/lib/product-type-settings";
import { getPublicProductsFilter } from "@/lib/product-seo";
import { getPhones, getSetting, getSiteSettingsForTenant } from "@/lib/site-settings";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";
import { STORE_SERVICE_AREAS, getServiceAreaBySlug } from "@/lib/store-service-areas";

const BASE = "https://pilo-rus.ru";

export const revalidate = 3600;

type Props = {
  params: { city: string };
};

export function generateStaticParams() {
  return STORE_SERVICE_AREAS.map((area) => ({ city: area.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = getServiceAreaBySlug(params.city);
  if (!area) return { title: "Город доставки не найден" };

  const title = `Доставка пиломатериалов ${area.to} — доска, брус, вагонка | ПилоРус`;
  const description = `ПилоРус доставляет пиломатериалы ${area.to} со склада в Химках. Доска, брус, вагонка, фанера и листовые материалы: наличие, расчет объема и доставка ${area.deliveryWindow}.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE}/delivery/${area.slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE}/delivery/${area.slug}`,
      siteName: "ПилоРус",
      locale: "ru_RU",
      type: "website",
    },
  };
}

function cityFaq(area: NonNullable<ReturnType<typeof getServiceAreaBySlug>>) {
  return [
    {
      q: `Сколько стоит доставка ${area.to}?`,
      a: `Стоимость зависит от объема, веса, адреса и необходимости разгрузки. Менеджер считает доставку ${area.to} после выбора материала и размеров.`,
    },
    {
      q: `Как быстро привезете пиломатериалы ${area.to}?`,
      a: `Обычный срок для этого направления — ${area.deliveryWindow}. Точную дату согласуем после проверки наличия и маршрута.`,
    },
    {
      q: "Можно ли заказать самовывоз?",
      a: "Да. Склад находится в Химках: можно забрать заказ самостоятельно после согласования наличия и времени отгрузки.",
    },
  ];
}

export default async function DeliveryCityPage({ params }: Props) {
  const area = getServiceAreaBySlug(params.city);
  if (!area) notFound();

  const tenantId = DEFAULT_TENANT_ID;
  const publicProductFilter = { tenantId, ...getPublicProductsFilter() };
  const [settings, categories, productNames, productTypeSettings] = await Promise.all([
    getSiteSettingsForTenant(tenantId),
    prisma.category.findMany({
      where: {
        tenantId,
        showInMenu: true,
        parentId: null,
        products: { some: publicProductFilter },
      },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true, _count: { select: { products: { where: publicProductFilter } } } },
      take: 8,
    }),
    prisma.product.findMany({
      where: { ...publicProductFilter, category: { tenantId, showInMenu: true } },
      select: { name: true },
      take: 80,
    }),
    getProductTypeSettings(),
  ]);

  const phones = getPhones(settings);
  const phone = phones[0]?.display || getSetting(settings, "phone");
  const phoneLink = phones[0]?.tel || getSetting(settings, "phone_link");
  const workingHours = getSetting(settings, "working_hours") || "Пн-Сб: 09:00-18:00";
  const types = getManagedProductTypes(
    productNames.map((product) => product.name),
    productTypeSettings,
  ).slice(0, 8);
  const faqs = cityFaq(area);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `Доставка пиломатериалов ${area.to}`,
    "serviceType": "Доставка пиломатериалов",
    "provider": {
      "@type": "LocalBusiness",
      "name": "ПилоРус",
      "url": BASE,
      "telephone": phone,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Химки",
        "addressRegion": "Московская область",
        "streetAddress": "Заводская 2А, стр.28",
        "addressCountry": "RU",
      },
    },
    "areaServed": {
      "@type": "City",
      "name": area.name,
    },
    "url": `${BASE}/delivery/${area.slug}`,
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Доставка", "item": `${BASE}/delivery` },
      { "@type": "ListItem", "position": 3, "name": area.name, "item": `${BASE}/delivery/${area.slug}` },
    ],
  };

  return (
    <div className="container store-mobile-safe-bottom py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">Главная</Link>
        <span>/</span>
        <Link href="/delivery" className="hover:text-primary">Доставка</Link>
        <span>/</span>
        <span className="text-foreground">{area.name}</span>
      </nav>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
            <Truck className="h-4 w-4" />
            Доставка ПилоРус
          </p>
          <h1 className="max-w-4xl font-display text-3xl font-bold leading-tight sm:text-5xl">
            Доставка пиломатериалов {area.to}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            Привозим доску, брус, вагонку, фанеру и листовые материалы {area.to} со склада в Химках.
            Проверяем наличие, подбираем размер и считаем доставку под объем заказа.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Clock, label: "Срок", value: area.deliveryWindow },
              { icon: MapPin, label: "Ориентир", value: `${area.distanceKm} км от склада` },
              { icon: Truck, label: "Маршрут", value: area.routeHint },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-card p-4">
                <item.icon className="mb-3 h-5 w-5 text-primary" />
                <p className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold leading-5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Быстрый расчет</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Для точной цены назовите материал, сечение, длину, объем и адрес {area.where}.
          </p>
          <div className="mt-4 grid gap-2">
            <Link
              href="/calculator"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Рассчитать объем
              <Calculator className="h-4 w-4" />
            </Link>
            <a
              href={`tel:${phoneLink}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold transition-colors hover:border-primary/45 hover:text-primary"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{workingHours}</p>
        </aside>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl font-bold">Что чаще заказывают {area.where}</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {types.map((type) => (
              <Link
                key={type.keyword}
                href={`/catalog?type=${encodeURIComponent(type.keyword)}`}
                className="group rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/45"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <PackageSearch className="h-4 w-4 text-primary" />
                  {type.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Цены, размеры и наличие в каталоге
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl font-bold">Категории с доставкой</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/45"
              >
                <span className="text-sm font-semibold">{category.name}</span>
                <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                  {category._count.products}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl font-bold">Как проходит доставка {area.to}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            "Вы выбираете материал и размер в каталоге.",
            "Менеджер проверяет наличие и считает объем.",
            `Согласуем маршрут ${area.to}, дату и разгрузку.`,
            "Привозим заказ и передаем документы.",
          ].map((text, index) => (
            <div key={text} className="rounded-xl border border-border bg-background p-4">
              <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl font-bold">Вопросы по доставке {area.to}</h2>
        <div className="mt-5 grid gap-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="rounded-xl border border-border bg-background p-4">
              <summary className="cursor-pointer text-sm font-semibold">{faq.q}</summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-primary/30 bg-primary/10 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold">Нужно быстро понять стоимость?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Пришлите список материалов и адрес {area.where}. Проверим наличие, посчитаем м3, штуки или м2 и скажем итоговую сумму.
            </p>
          </div>
          <a
            href={`tel:${phoneLink}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CheckCircle className="h-4 w-4" />
            Позвонить
          </a>
        </div>
      </section>
    </div>
  );
}
