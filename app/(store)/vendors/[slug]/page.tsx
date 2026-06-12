export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Package, Phone, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";

type Props = {
  params: { slug: string };
};

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `${new Intl.NumberFormat("ru-RU").format(num)} ₽`;
}

async function getSupplier(slug: string) {
  const tenantId = getCurrentTenantId();
  return prisma.supplier.findFirst({
    where: {
      tenantId,
      slug,
      active: true,
      status: "ACTIVE",
      storefrontEnabled: true,
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supplier = await getSupplier(params.slug);
  if (!supplier) return { title: "Продавец не найден" };
  const description =
    supplier.publicDescription ||
    `${supplier.name}: витрина продавца на ПилоРус, товары, цены, доставка и контакты.`;

  return {
    title: `${supplier.name} - витрина продавца на ПилоРус`,
    description,
    alternates: { canonical: `https://pilo-rus.ru/vendors/${supplier.slug}` },
    openGraph: {
      title: `${supplier.name} - ПилоРус`,
      description,
      url: `https://pilo-rus.ru/vendors/${supplier.slug}`,
      images: supplier.logoUrl ? [{ url: supplier.logoUrl, alt: supplier.name }] : [],
      type: "website",
      locale: "ru_RU",
    },
  };
}

export default async function VendorStorefrontPage({ params }: Props) {
  const tenantId = getCurrentTenantId();
  const supplier = await getSupplier(params.slug);
  if (!supplier) notFound();

  const offers = await prisma.supplierOffer.findMany({
    where: {
      tenantId,
      supplierId: supplier.id,
      active: true,
      variant: {
        ...getPublicVariantsFilter(),
        product: {
          tenantId,
          ...getPublicProductsFilter(),
        },
      },
    },
    include: {
      variant: {
        include: {
          product: {
            include: {
              category: true,
              variants: { where: getPublicVariantsFilter(), orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
    orderBy: [{ preferred: "desc" }, { updatedAt: "desc" }],
    take: 80,
  });

  const productSchema = offers.slice(0, 20).map((offer) => {
    const product = offer.variant.product;
    const price = formatMoney(offer.pricePerPiece ?? offer.pricePerCube);
    return {
      "@type": "Offer",
      "name": `${product.name} ${offer.variant.size}`,
      "url": `https://pilo-rus.ru/product/${product.slug}`,
      "priceCurrency": "RUB",
      ...(price ? { "price": Number(offer.pricePerPiece ?? offer.pricePerCube) } : {}),
      "seller": { "@type": "Organization", "name": supplier.name },
    };
  });
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": supplier.name,
    "url": `https://pilo-rus.ru/vendors/${supplier.slug}`,
    "logo": supplier.logoUrl || undefined,
    "telephone": supplier.phone || undefined,
    "email": supplier.email || undefined,
    "address": supplier.address || supplier.city || undefined,
    "makesOffer": productSchema,
  };

  return (
    <div className="container py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <Link href="/vendors" className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
        <ArrowLeft className="h-4 w-4" />
        Все продавцы
      </Link>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_0.9fr] lg:items-stretch">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background text-2xl font-bold text-primary">
              {supplier.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={supplier.logoUrl} alt={supplier.name} className="h-full w-full object-contain p-3" />
              ) : (
                supplier.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {supplier.featuredSeller ? <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Продавец N1</span> : null}
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">Проверяется ПилоРус</span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">{supplier.name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {supplier.publicDescription || "Витрина продавца внутри ПилоРус: товары, цены, остатки, доставка и контакты после проверки."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold text-foreground">Информация продавца</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <InfoRow icon={Package} label="Специализация" value={supplier.specialization || "Пиломатериалы и стройматериалы"} />
            <InfoRow icon={Truck} label="Доставка" value={supplier.deliverySummary || "Условия доставки уточняются при заявке"} />
            <InfoRow icon={Phone} label="Телефон" value={supplier.phone || "Контакт через ПилоРус"} />
            <InfoRow icon={ShieldCheck} label="Статус" value={supplier.featuredSeller ? "ПилоРус - продавец N1" : "Подключенный продавец"} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {supplier.phone ? (
              <a href={`tel:${supplier.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Позвонить
                <Phone className="h-4 w-4" />
              </a>
            ) : null}
            {supplier.website ? (
              <a href={supplier.website} target="_blank" rel="noreferrer" className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                Сайт продавца
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Предложения</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Товары и цены продавца</h2>
          </div>
          <span className="text-sm text-muted-foreground">{offers.length} позиций</span>
        </div>

        {offers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">Предложения готовятся</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Товары появятся после проверки цен, остатков и фото.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => {
              const product = offer.variant.product;
              const pricePiece = formatMoney(offer.pricePerPiece);
              const priceCube = formatMoney(offer.pricePerCube);
              const image = product.images[0];
              return (
                <article key={offer.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <Link href={`/product/${product.slug}`} className="block bg-background">
                    <div className="aspect-[4/3] overflow-hidden">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Фото готовится</div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{product.category.name}</p>
                    <Link href={`/product/${product.slug}`} className="mt-2 block font-display text-lg font-semibold leading-tight text-foreground hover:text-primary">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{offer.variant.size}</p>
                    <div className="mt-4 grid gap-2 text-sm">
                      <PriceLine label="м3" value={priceCube} />
                      <PriceLine label="шт" value={pricePiece} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {offer.preferred ? <Badge>Приоритет</Badge> : null}
                      <Badge>{offer.stockQty ?? "?"} шт</Badge>
                      <Badge>{offer.leadTimeDays ? `${offer.leadTimeDays} дн.` : "срок уточнить"}</Badge>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-background p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
      <span className="text-muted-foreground">Цена за {label}</span>
      <span className="font-semibold text-foreground">{value || "по запросу"}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-[26px] items-center rounded-full border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground">
      {children}
    </span>
  );
}
