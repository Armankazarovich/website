export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Package, ShieldCheck, Star, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { supplierStorefrontHref } from "@/lib/supplier-profile";

export const metadata: Metadata = {
  title: "Поставщики ПилоРус - пиломатериалы, цены и доставка",
  description: "Поставщики пиломатериалов на ПилоРус: витрины, ассортимент, цены, доставка, контакты и быстрый запрос менеджеру.",
  alternates: { canonical: "https://pilo-rus.ru/vendors" },
};

export default async function VendorsPage() {
  const tenantId = getCurrentTenantId();
  const suppliers = await prisma.supplier.findMany({
    where: {
      tenantId,
      active: true,
      status: "ACTIVE",
      storefrontEnabled: true,
    },
    include: { _count: { select: { offers: true } } },
    orderBy: [{ featuredSeller: "desc" }, { marketplaceRank: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="container py-10">
      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Проверенные поставщики</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">Поставщики ПилоРус</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Здесь собраны витрины поставщиков пиломатериалов, фанеры и стройматериалов. Выбирайте продавца, смотрите ассортимент, уточняйте наличие и условия доставки в одном месте.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MiniStat icon={Star} label="Официальная витрина" value="ПилоРус №1" />
            <MiniStat icon={ShieldCheck} label="Проверка условий" value="До показа клиентам" />
            <MiniStat icon={BadgeCheck} label="Цены и доставка" value="В карточке продавца" />
          </div>
        </div>
      </section>

      {suppliers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Витрины готовятся</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Скоро здесь появятся поставщики с ассортиментом, условиями доставки и быстрым запросом менеджеру.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background text-base font-bold text-primary">
                  {supplier.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={supplier.logoUrl} alt={supplier.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    supplier.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {supplier.featuredSeller ? <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">N1</span> : null}
                    <h2 className="truncate font-display text-xl font-semibold text-foreground">{supplier.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{supplier.specialization || "Пиломатериалы и стройматериалы"}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {supplier.publicDescription || "Витрина поставщика на ПилоРус: ассортимент, цены, остатки, доставка и быстрый запрос менеджеру."}
              </p>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />{supplier.deliverySummary || "Доставка и самовывоз уточняются"}</span>
                <span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-primary" />{supplier._count.offers} предложений</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={supplierStorefrontHref(supplier.slug)} className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                  Открыть витрину
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
