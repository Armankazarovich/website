export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Filter, Package, Phone, Search, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";

type Props = {
  params: { slug: string };
  searchParams?: { q?: string; category?: string };
};

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `${new Intl.NumberFormat("ru-RU").format(num)} ₽`;
}

function normalizeParam(value: string | undefined, maxLength = 80) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function formatDate(value: Date | null) {
  if (!value) return "обновление готовится";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long" }).format(value);
}

function priceValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function vendorHref(slug: string, params?: { q?: string; category?: string }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.category) query.set("category", params.category);
  const suffix = query.toString();
  return `/vendors/${slug}${suffix ? `?${suffix}` : ""}`;
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

export default async function VendorStorefrontPage({ params, searchParams }: Props) {
  const tenantId = getCurrentTenantId();
  const supplier = await getSupplier(params.slug);
  if (!supplier) notFound();
  const query = normalizeParam(searchParams?.q);
  const requestedCategory = normalizeParam(searchParams?.category, 120);

  const baseOfferWhere = {
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
  };

  const allSellerOffers = await prisma.supplierOffer.findMany({
    where: baseOfferWhere,
    select: {
      updatedAt: true,
      pricePerCube: true,
      pricePerPiece: true,
      variant: {
        select: {
          product: {
            select: {
              category: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
    take: 500,
  });
  const categoryMap = new Map<string, { name: string; slug: string; count: number }>();
  let minPrice: number | null = null;
  let lastUpdated: Date | null = null;
  for (const offer of allSellerOffers) {
    const category = offer.variant.product.category;
    const current = categoryMap.get(category.slug) || { name: category.name, slug: category.slug, count: 0 };
    current.count++;
    categoryMap.set(category.slug, current);
    for (const price of [priceValue(offer.pricePerPiece), priceValue(offer.pricePerCube)]) {
      if (price !== null) minPrice = minPrice === null ? price : Math.min(minPrice, price);
    }
    if (!lastUpdated || offer.updatedAt > lastUpdated) lastUpdated = offer.updatedAt;
  }
  const categories = [...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const activeCategory = categories.some((category) => category.slug === requestedCategory) ? requestedCategory : "";

  const offers = await prisma.supplierOffer.findMany({
    where: {
      tenantId,
      supplierId: supplier.id,
      active: true,
      variant: {
        ...getPublicVariantsFilter(),
        ...(query
          ? {
              OR: [
                { size: { contains: query, mode: "insensitive" } },
                { product: { name: { contains: query, mode: "insensitive" } } },
                { product: { slug: { contains: query.toLowerCase(), mode: "insensitive" } } },
                { product: { category: { name: { contains: query, mode: "insensitive" } } } },
              ],
            }
          : {}),
        product: {
          tenantId,
          ...getPublicProductsFilter(),
          ...(activeCategory ? { category: { slug: activeCategory } } : {}),
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
    take: 96,
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
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <StoreMetric label="Позиций продавца" value={allSellerOffers.length} hint="активные предложения" />
          <StoreMetric label="Категорий" value={categories.length} hint="можно фильтровать" />
          <StoreMetric label="Цена от" value={formatMoney(minPrice) || "по запросу"} hint={`обновлено: ${formatDate(lastUpdated)}`} />
        </div>

        <div className="mb-5 rounded-2xl border border-border bg-card p-4">
          <form action={`/vendors/${supplier.slug}`} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)_auto_auto] lg:items-end">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Поиск по товарам продавца</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="доска 50x150, фанера, брус..."
                  className="min-h-[42px] w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Категории продавца</span>
              <select
                name="category"
                defaultValue={activeCategory}
                className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Все категории</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <Filter className="h-4 w-4" />
              Найти
            </button>
            {(query || activeCategory) ? (
              <Link href={`/vendors/${supplier.slug}`} className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                Сбросить
              </Link>
            ) : null}
          </form>
          {categories.length > 0 ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <Link href={vendorHref(supplier.slug, query ? { q: query } : undefined)} className={`inline-flex min-h-[34px] shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${!activeCategory ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                Все предложения
              </Link>
              {categories.slice(0, 12).map((category) => (
                <Link
                  key={category.slug}
                  href={vendorHref(supplier.slug, { q: query, category: category.slug })}
                  className={`inline-flex min-h-[34px] shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${activeCategory === category.slug ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

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
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{allSellerOffers.length > 0 ? "По фильтру ничего не найдено" : "Предложения готовятся"}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {allSellerOffers.length > 0 ? "Попробуйте другой запрос или откройте все предложения продавца." : "Товары появятся после проверки цен, остатков и фото."}
            </p>
            {allSellerOffers.length > 0 ? (
              <Link href={`/vendors/${supplier.slug}`} className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                Показать все предложения
              </Link>
            ) : null}
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

function StoreMetric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
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
