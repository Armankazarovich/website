import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServiceImageUrls } from "@/lib/service-gallery";
import { getSetting, getSiteSettings } from "@/lib/site-settings";
import { AdminEditButton } from "@/components/admin/admin-edit-button";
import { ServiceRequestForm } from "@/components/store/service-request-form";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  GraduationCap,
  Images,
  Layers,
  MapPin,
  Paintbrush,
  Phone,
  Scissors,
  Sparkles,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
};

const ICON_MAP: Record<string, LucideIcon> = {
  CalendarCheck,
  Gauge,
  GraduationCap,
  Images,
  Layers,
  MapPin,
  Paintbrush,
  Scissors,
  Sparkles,
  Truck,
  Wrench,
};

function ServiceIcon({ name }: { name: string | null }) {
  const Icon = name ? (ICON_MAP[name] ?? Wrench) : Wrench;
  return <Icon className="h-6 w-6" />;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactDescription(...parts: Array<string | null | undefined>) {
  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= 170) return text;
  return `${text.slice(0, 167).trim()}...`;
}

async function getService(slug: string) {
  return prisma.service.findUnique({
    where: { slug, active: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await getService(params.slug);
  if (!service) return { title: "Услуга не найдена" };

  const description = compactDescription(
    service.description,
    stripHtml(service.content),
  );
  const images = getServiceImageUrls(service.image);

  return {
    title: `${service.title} — ПилоРус`,
    description,
    alternates: { canonical: `https://pilo-rus.ru/services/${service.slug}` },
    openGraph: {
      title: `${service.title} — ПилоРус`,
      description,
      url: `https://pilo-rus.ru/services/${service.slug}`,
      ...(images[0] ? { images: [{ url: images[0] }] } : {}),
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const [service, siteSettings, relatedServices] = await Promise.all([
    getService(params.slug),
    getSiteSettings(),
    prisma.service.findMany({
      where: { active: true, NOT: { slug: params.slug } },
      orderBy: { sortOrder: "asc" },
      take: 3,
    }),
  ]);

  if (!service) notFound();

  const phone = getSetting(siteSettings, "phone_link") || "+74951352026";
  const images = getServiceImageUrls(service.image);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    provider: {
      "@type": "Organization",
      name: "ПилоРус",
      url: "https://pilo-rus.ru",
    },
    areaServed: "Москва и Московская область",
    serviceType: service.title,
    offers: service.price
      ? {
          "@type": "Offer",
          priceCurrency: "RUB",
          description: service.price,
        }
      : undefined,
  };

  return (
    <div className="container store-mobile-safe-bottom py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/services"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/35"
        >
          <ArrowLeft className="h-4 w-4" />
          Все услуги
        </Link>
        <AdminEditButton href="/admin/services" mode="inline" label="Редактировать услугу" />
      </div>

      <section className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-3">
          {images[0] ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <img
                src={images[0]}
                alt={service.title}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl border border-border bg-primary/10 text-primary">
              <ServiceIcon name={service.icon} />
            </div>
          )}

          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={`${service.title} ${index + 2}`}
                  className="aspect-[4/3] rounded-xl border border-border object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            <ServiceIcon name={service.icon} />
            Услуга
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl">
            {service.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {service.description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Цена
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-primary">
                {service.price || "по запросу"}
              </p>
              {service.unit && (
                <p className="text-xs text-muted-foreground">{service.unit}</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Заявка
              </p>
              <p className="mt-2 text-sm font-semibold">попадает в CRM</p>
              <p className="mt-1 text-xs text-muted-foreground">с услугой и временем</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Арай
              </p>
              <p className="mt-2 text-sm font-semibold">помогает вести клиента</p>
              <p className="mt-1 text-xs text-muted-foreground">без потери контекста</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 lg:grid-cols-[1fr_380px]">
        <article className="rounded-3xl border border-border bg-card p-5 md:p-7">
          <div className="mb-5 flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              Что входит
            </span>
          </div>
          <div
            className="text-sm leading-7 text-foreground/85
              [&_p]:mb-4 [&_ul]:my-4 [&_ul]:list-none [&_ul]:space-y-2
              [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0
              [&_li]:before:top-0 [&_li]:before:text-primary [&_li]:before:content-['—']"
            dangerouslySetInnerHTML={{ __html: service.content }}
          />

          {relatedServices.length > 0 && (
            <div className="mt-8 border-t border-border pt-5">
              <h2 className="font-display text-xl font-bold">Похожие услуги</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {relatedServices.map((item) => (
                  <Link
                    key={item.id}
                    href={`/services/${item.slug}`}
                    className="rounded-2xl border border-border bg-background/45 p-4 transition-colors hover:border-primary/35"
                  >
                    <p className="font-semibold leading-snug">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Открыть <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        <aside id="request" className="space-y-4 lg:sticky lg:top-24">
          <ServiceRequestForm
            serviceTitle={service.title}
            serviceSlug={service.slug}
            phoneLink={phone}
          />
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-primary">
              <Phone className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                Быстрый контакт
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Если нужно срочно, звоните сразу. Заявка и звонок могут идти
              параллельно.
            </p>
            <a
              href={`tel:${phone}`}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/35"
            >
              Позвонить
            </a>
          </div>
        </aside>
      </section>
    </div>
  );
}
