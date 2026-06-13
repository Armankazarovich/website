export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Filter,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { ProductCard } from "@/components/store/product-card";
import { VendorContactActions } from "@/components/store/vendor-contact-actions";
import { VendorLeadForm } from "@/components/store/vendor-lead-form";

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
    `${supplier.name}: поставщик на ПилоРус, ассортимент, цены, доставка и контакты.`;

  return {
    title: `${supplier.name} - поставщик на ПилоРус`,
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
  const sellerProductMap = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      category: string;
      shortDescription: string | null;
      description: string | null;
      images: string[];
      cardTags: string[];
      saleUnit: "CUBE" | "PIECE" | "BOTH";
      variants: Array<{
        id: string;
        size: string;
        pricePerCube: number | null;
        pricePerPiece: number | null;
        piecesPerCube: number | null;
        inStock: boolean;
        stockQty: number | null;
        lowStockThreshold: number | null;
      }>;
    }
  >();
  for (const offer of offers) {
    const product = offer.variant.product;
    const current =
      sellerProductMap.get(product.id) ||
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category.name,
        shortDescription: product.shortDescription,
        description: product.description,
        images: product.images,
        cardTags: product.cardTags,
        saleUnit: product.saleUnit,
        variants: [],
      };
    current.variants.push({
      id: offer.variant.id,
      size: offer.variant.size,
      pricePerCube: priceValue(offer.pricePerCube) ?? priceValue(offer.variant.pricePerCube),
      pricePerPiece: priceValue(offer.pricePerPiece) ?? priceValue(offer.variant.pricePerPiece),
      piecesPerCube: offer.variant.piecesPerCube,
      inStock: offer.variant.inStock && offer.active,
      stockQty: offer.stockQty ?? offer.variant.stockQty,
      lowStockThreshold: offer.variant.lowStockThreshold,
    });
    sellerProductMap.set(product.id, current);
  }
  const sellerProducts = [...sellerProductMap.values()];
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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_0.92fr] lg:items-stretch">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
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
                {supplier.featuredSeller ? <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Поставщик №1</span> : null}
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">Условия проверены</span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">{supplier.name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {supplier.publicDescription || `${supplier.name} помогает подобрать пиломатериалы, фанеру и стройматериалы для ремонта, строительства и снабжения. Смотрите товары, уточняйте наличие и отправляйте запрос менеджеру.`}
              </p>
              <div className="mt-5">
                <VendorContactActions
                  sellerName={supplier.name}
                  sellerUrl={`https://pilo-rus.ru/vendors/${supplier.slug}`}
                  phone={supplier.phone}
                  specialization={supplier.specialization}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroTrustItem icon={Package} label="Ассортимент" value={allSellerOffers.length > 0 ? `${allSellerOffers.length} предложений` : "по заявке"} />
            <HeroTrustItem icon={BadgeCheck} label="Категории" value={categories.length > 0 ? `${categories.length} направления` : "подберем"} />
            <HeroTrustItem icon={Clock3} label="Обновлено" value={formatDate(lastUpdated)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              цены и наличие уточняются перед оплатой
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
              <Truck className="h-3.5 w-3.5 text-primary" />
              доставка рассчитывается по адресу
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold text-foreground">О продавце</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <InfoRow icon={Package} label="Специализация" value={supplier.specialization || "Пиломатериалы и стройматериалы"} />
            <InfoRow icon={Truck} label="Доставка" value={supplier.deliverySummary || "Условия доставки уточняются при заявке"} />
            <InfoRow icon={Phone} label="Телефон" value={supplier.phone || "Контакт через ПилоРус"} />
            <InfoRow icon={ShieldCheck} label="Статус" value={supplier.featuredSeller ? "Официальный поставщик ПилоРус" : "Поставщик на ПилоРус"} />
          </div>
          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Как купить быстрее</p>
            <div className="mt-3 grid gap-2">
              <QuickPathItem icon={Search} text="Выберите товар или напишите нужный размер в поиске." />
              <QuickPathItem icon={ClipboardList} text="Оставьте объем, адрес и удобный способ связи." />
              <QuickPathItem icon={MessageCircle} text="Менеджер уточнит наличие, цену, срок и доставку." />
            </div>
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

      <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Витрина продавца</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Быстрые сценарии для покупки</h2>
          </div>
          <Link href="#vendor-products" className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
            Перейти к товарам
          </Link>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          <StoryCard
            icon={BadgeCheck}
            title="Подбор по задаче"
            text="Напишите, что строите и какой нужен объем. Менеджер подберет размеры и позиции."
            href="#vendor-request"
            action="Оставить запрос"
          />
          <StoryCard
            icon={Truck}
            title="Доставка и самовывоз"
            text="Уточните адрес, сроки и разгрузку. Подскажем удобный вариант поставки."
            href="#vendor-request"
            action="Рассчитать доставку"
          />
          <StoryCard
            icon={Clock3}
            title="Быстрый ответ"
            text="Отправьте запрос из витрины, чтобы не искать контакты и не собирать список вручную."
            href="#vendor-request"
            action="Написать"
          />
          <StoryCard
            icon={Star}
            title="Сравнение предложений"
            text="Смотрите цены продавца в привычных карточках ПилоРус и выбирайте нужный размер."
            href="#vendor-products"
            action="Смотреть цены"
          />
        </div>
      </section>

      <div className="mt-6">
        <VendorLeadForm sellerName={supplier.name} sellerSlug={supplier.slug} phone={supplier.phone} />
      </div>

      <section id="vendor-products" className="mt-8 scroll-mt-24">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <StoreMetric label="Позиций в продаже" value={allSellerOffers.length} hint="актуальный ассортимент" />
          <StoreMetric label="Категорий" value={categories.length} hint="удобно выбирать" />
          <StoreMetric label="Цена от" value={formatMoney(minPrice) || "по запросу"} hint={`обновлено: ${formatDate(lastUpdated)}`} />
        </div>

        <div className="mb-5 rounded-2xl border border-border bg-card p-4">
          <form action={`/vendors/${supplier.slug}`} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)_auto_auto] lg:items-end">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Найти товар у продавца</span>
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
              <span className="font-medium text-foreground">Категории</span>
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
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Ассортимент</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Товары и цены</h2>
          </div>
          <span className="text-sm text-muted-foreground">{sellerProducts.length} товаров / {offers.length} размеров</span>
        </div>

        {sellerProducts.length === 0 ? (
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
            {sellerProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                category={product.category}
                shortDescription={product.shortDescription}
                description={product.description}
                images={product.images}
                cardTags={product.cardTags}
                saleUnit={product.saleUnit}
                variants={product.variants}
                featured={supplier.featuredSeller}
              />
            ))}
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

function StoryCard({
  icon: Icon,
  title,
  text,
  href,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <article className="min-w-[260px] flex-1 snap-start rounded-2xl border border-border bg-background p-4 sm:min-w-[320px]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      <Link href={href} className="mt-4 inline-flex min-h-[36px] items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent">
        {action}
      </Link>
    </article>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
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

function HeroTrustItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function QuickPathItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex gap-2 text-sm leading-5 text-muted-foreground">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span>{text}</span>
    </div>
  );
}
