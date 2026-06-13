export const dynamic = "force-dynamic";

import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  ClipboardCheck,
  Handshake,
  PackageSearch,
  Search,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { supplierStorefrontHref } from "@/lib/supplier-profile";

export const metadata: Metadata = {
  title: "ПилоРус Биржа пиломатериалов - продавцы, товары, цены",
  description:
    "ПилоРус Биржа пиломатериалов: один чистый каталог, витрины продавцов, цены, остатки, доставка и заявки без дублей товаров.",
  alternates: { canonical: "https://pilo-rus.ru/marketplace" },
};

function formatMoney(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "по запросу";
  return `${new Intl.NumberFormat("ru-RU").format(num)} ₽`;
}

export default async function MarketplacePage() {
  const tenantId = getCurrentTenantId();
  const publicProductFilter = getPublicProductsFilter();
  const publicVariantFilter = getPublicVariantsFilter();

  const [publicSellers, candidateSellers, categories, productsCount, offersCount, topOffers] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId, active: true, status: "ACTIVE", storefrontEnabled: true },
      include: { _count: { select: { offers: true } } },
      orderBy: [{ featuredSeller: "desc" }, { marketplaceRank: "asc" }],
      take: 6,
    }),
    prisma.supplier.count({
      where: { tenantId, active: true, sourceUrl: { not: null }, storefrontEnabled: false },
    }),
    prisma.category.findMany({
      where: { tenantId, showInMenu: true },
      include: { _count: { select: { products: { where: publicProductFilter } } } },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    prisma.product.count({ where: { tenantId, ...publicProductFilter } }),
    prisma.supplierOffer.count({ where: { tenantId, active: true } }),
    prisma.supplierOffer.findMany({
      where: {
        tenantId,
        active: true,
        supplier: { active: true, status: "ACTIVE", storefrontEnabled: true },
        variant: {
          ...publicVariantFilter,
          product: { tenantId, ...publicProductFilter },
        },
      },
      include: {
        supplier: true,
        variant: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
      orderBy: [{ preferred: "desc" }, { updatedAt: "desc" }],
      take: 6,
    }),
  ]);

  return (
    <div className="pb-14">
      <section className="border-b border-border bg-background">
        <div className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.15fr)_0.85fr] lg:items-center lg:py-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">ПилоРус Биржа пиломатериалов</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Один каталог, несколько продавцов, честное сравнение цен
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
              Покупатель ищет товар один раз, а система показывает проверенные предложения продавцов: цену, остаток, склад, срок и доставку. Без дублей и запутанных карточек.
            </p>
            <form action="/catalog" className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="search"
                  placeholder="Доска обрезная 1 сорт ГОСТ, фанера, брус..."
                  className="min-h-[52px] w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </label>
              <button className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Найти
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/vendors" className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                <Store className="h-4 w-4 text-primary" />
                Продавцы
              </Link>
              <Link href="/catalog?instock=1" className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                <Boxes className="h-4 w-4 text-primary" />
                В наличии
              </Link>
              <Link href="/contacts" className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15">
                Подобрать материал
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard icon={PackageSearch} label="Товаров в чистом каталоге" value={productsCount.toString()} />
            <StatCard icon={Handshake} label="Предложений продавцов" value={offersCount.toString()} />
            <StatCard icon={Store} label="Опубликованных витрин" value={publicSellers.length.toString()} />
            <StatCard icon={ClipboardCheck} label="Продавцов в подключении" value={candidateSellers.toString()} />
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid gap-4 lg:grid-cols-3">
          <FeatureCard
            icon={ShieldCheck}
            title="Без дублей товара"
            text="Одна карточка товара собирает предложения разных продавцов. SEO и каталог остаются чистыми."
          />
          <FeatureCard
            icon={BadgeCheck}
            title="Проверка перед загрузкой"
            text="Прайс-лист продавца сначала сопоставляется с каталогом: существующие товары, похожие позиции и новые кандидаты отделяются друг от друга."
          />
          <FeatureCard
            icon={Truck}
            title="Цена вместе с условиями"
            text="Покупателю важны не только рубли, но и склад, срок, доставка, остаток и способ оплаты."
          />
        </div>
      </section>

      <section className="container grid gap-8 py-6 lg:grid-cols-[minmax(0,0.95fr)_1.05fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Категории</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Быстрый вход в каталог</h2>
            </div>
            <Link href="/catalog" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
              Весь каталог
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <Link key={category.id} href={`/catalog?category=${category.slug}`} className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-foreground group-hover:text-primary">{category.name}</h3>
                  <span className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                    {category._count.products}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Товары, размеры, цены и наличие</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Продавцы</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Витрины внутри ПилоРус</h2>
            </div>
            <Link href="/vendors" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
              Все продавцы
            </Link>
          </div>
          <div className="grid gap-3">
            {publicSellers.map((seller) => (
              <Link key={seller.id} href={supplierStorefrontHref(seller.slug)} className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background text-sm font-bold text-primary">
                    {seller.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={seller.logoUrl} alt={seller.name} className="h-full w-full object-contain p-2" />
                    ) : (
                      seller.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {seller.featuredSeller ? <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">N1</span> : null}
                      <h3 className="truncate font-semibold text-foreground group-hover:text-primary">{seller.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{seller.specialization || "Пиломатериалы и стройматериалы"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{seller._count.offers} предложений</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Предложения</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Предложения продавцов</h2>
          </div>
          <Link href="/catalog" className="text-sm font-semibold text-primary hover:underline">Перейти в каталог</Link>
        </div>
        {topOffers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Предложения появятся после синхронизации продавцов.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topOffers.map((offer) => {
              const product = offer.variant.product;
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
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{offer.supplier.name}</p>
                    <Link href={`/product/${product.slug}`} className="mt-2 block font-display text-lg font-semibold leading-tight text-foreground hover:text-primary">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{offer.variant.size}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full border border-border bg-background px-3 py-1 font-semibold text-foreground">
                        м3: {formatMoney(offer.pricePerCube)}
                      </span>
                      <span className="rounded-full border border-border bg-background px-3 py-1 font-semibold text-foreground">
                        шт: {formatMoney(offer.pricePerPiece)}
                      </span>
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

function StatCard({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
