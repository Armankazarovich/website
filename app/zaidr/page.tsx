import type { Metadata } from "next";
import Image from "next/image";
import {
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Layers3,
  Package,
  Phone,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { MultisiteStoreShell } from "@/components/multisite/multisite-store-shell";
import { getMultisiteProfile } from "@/lib/multisite-sites";
import {
  getZaidrCategoryImage,
  ZAIDR_CATEGORIES,
  ZAIDR_PRODUCTS,
  ZAIDR_SITE,
  ZAIDR_SOURCE_FILES,
} from "@/lib/zaidr-catalog";
import { ZaidrStoreClient } from "./zaidr-store-client";

const profile = getMultisiteProfile("zaidr");
const featuredCategories = ZAIDR_CATEGORIES.slice(0, 8);
const firstProducts = ZAIDR_PRODUCTS.slice(0, 3);

export const metadata: Metadata = {
  title: {
    absolute: `${profile.title} — каталог, доставка и заявки`,
  },
  description:
    "Зейдр: стройматериалы и расходники в Воронеже. Каталог из прайсов, подбор товаров, заявка менеджеру, доставка и оплата.",
  alternates: {
    canonical: `https://${profile.domain}`,
  },
};

export default function ZaidrPage() {
  return (
    <MultisiteStoreShell profile={profile} categories={ZAIDR_CATEGORIES}>
      <main>
        <section className="relative overflow-hidden bg-slate-950 text-foreground">
          <Image
            src="/images/production/sklad-3.jpg"
            alt="Склад стройматериалов"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-36"
          />
          <div className="absolute inset-0 bg-card" />
          <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-7 inline-flex rounded-xl bg-card p-4 shadow-2xl shadow-orange-950/30">
                <Image
                  src={profile.logoUrl}
                  alt={profile.name}
                  width={360}
                  height={120}
                  priority
                  className="h-auto w-[min(72vw,360px)] object-contain"
                />
              </div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-orange-200">
                {profile.city} · стройматериалы и расходники
              </p>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
                Материалы для ремонта, стройки и снабжения
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100">
                Герметики, монтажная пена, краски, сетки, скотч, перчатки и
                расходные материалы. Выберите позиции в каталоге, оставьте
                заявку, менеджер уточнит наличие, объем и доставку.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#catalog"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 text-base font-black text-foreground shadow-xl shadow-orange-950/30 transition hover:bg-orange-700"
                >
                  <Package className="h-5 w-5" />
                  Открыть каталог
                </a>
                <a
                  href={`tel:${profile.phoneHref}`}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-border/25 bg-card/10 px-7 text-base font-bold text-foreground  transition hover:bg-card/18"
                >
                  <Phone className="h-5 w-5" />
                  {profile.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-border/16 bg-card/10 p-4 shadow-2xl shadow-slate-950/40 ">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Товаров", value: ZAIDR_PRODUCTS.length, icon: Database },
                  { label: "Разделов", value: ZAIDR_CATEGORIES.length, icon: Layers3 },
                  { label: "Город", value: profile.city, icon: Building2 },
                  { label: "Домен", value: profile.domain, icon: ShieldCheck },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/12 bg-slate-950/35 p-4">
                    <item.icon className="mb-4 h-5 w-5 text-orange-300" />
                    <p className="text-sm text-slate-300">{item.label}</p>
                    <p className="mt-1 text-2xl font-black">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-orange-300/30 bg-orange-500/14 p-5">
                <div className="flex items-start gap-3">
                  <Bot className="mt-1 h-5 w-5 shrink-0 text-orange-200" />
                  <div>
                    <h2 className="text-xl font-black">Помощник Арай</h2>
                    <p className="mt-2 text-sm leading-6 text-orange-50">
                      Помогает подобрать категорию, собрать список товаров и
                      передать заявку менеджеру без потери деталей.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-card">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              { title: "Каталог загружен", text: `${ZAIDR_PRODUCTS.length} позиций из прайсов: ${ZAIDR_SOURCE_FILES.join(", ")}`, icon: ClipboardList },
              { title: "Заявка менеджеру", text: "Выбранные товары, контакт и комментарий уходят в CRM.", icon: CheckCircle2 },
              { title: "Доставка и оплата", text: "Подбираем вариант под объем заказа, город и тип клиента.", icon: Truck },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-orange-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-black text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-600">
                Разделы
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                Основные категории
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Каталог собран из реальных прайсов. Цены показываем как ориентир,
              итоговые наличие, объем и доставку менеджер подтверждает после заявки.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featuredCategories.map((category, index) => (
              <article key={category.name} className="group overflow-hidden rounded-xl border border-slate-200 bg-card ">
                <div className="relative h-36">
                  <Image
                    src={getZaidrCategoryImage(index)}
                    alt={category.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-card from-slate-950/82 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-lg font-black text-foreground">{category.name}</h3>
                    <p className="text-sm text-slate-200">{category.count} позиций</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-7 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-600">
                Каталог
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                Выберите товары в заявку
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {firstProducts.map((product) => (
                <div key={`${product.sku}-${product.name}`} className="rounded-xl border border-slate-200 bg-card p-4 ">
                  <p className="text-xs text-slate-500">арт. {product.sku}</p>
                  <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-950">{product.name}</p>
                </div>
              ))}
            </div>
          </div>
          <ZaidrStoreClient />
        </section>

        <section id="delivery" className="border-t border-slate-200 bg-card">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
            {[
              { title: "Доставка", text: ZAIDR_SITE.delivery, icon: Truck },
              { title: "Оплата", text: ZAIDR_SITE.payment, icon: WalletCards },
              { title: "Подбор", text: "Если не знаете точное название, оставьте задачу. Менеджер и Арай помогут собрать список.", icon: Bot },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <item.icon className="mb-5 h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-black text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </MultisiteStoreShell>
  );
}
