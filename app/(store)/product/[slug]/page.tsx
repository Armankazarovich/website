export const dynamic = "force-dynamic";
import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VariantSelector } from "@/components/store/variant-selector";
import { VariantCards } from "@/components/store/variant-cards";
import { ProductCard } from "@/components/store/product-card";
import { DescriptionAccordion } from "@/components/store/description-accordion";
import { Package, Phone, ArrowLeft } from "lucide-react";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { category: true, variants: { where: { inStock: true }, orderBy: { pricePerCube: 'asc' }, take: 1 } },
  });

  if (!product) return { title: "Товар не найден" };

  const minPrice = product.variants[0]?.pricePerCube
    ? `от ${Number(product.variants[0].pricePerCube).toLocaleString('ru-RU')} ₽/м³`
    : '';

  return {
    title: `${product.name} ${minPrice} — купить в Химках с доставкой по Москве | ПилоРус`,
    description: `${product.name} от производителя ООО ПИТИ в Химках. ${minPrice}. Доставка по Москве и МО за 1-3 дня. Гарантия качества, ГОСТ. ☎ 8-985-970-71-33`,
    keywords: `${product.name}, купить ${product.name}, ${product.name} цена, ${product.name} Москва, ${product.name} Химки, пиломатериалы от производителя`,
    openGraph: {
      title: `${product.name} — ПилоРус`,
      description: product.description || `Купить ${product.name} от производителя`,
      images: product.images[0] ? [{ url: product.images[0], width: 800, height: 600, alt: product.name }] : [],
      type: 'website',
      locale: 'ru_RU',
    },
    alternates: {
      canonical: `https://pilo-rus.ru/product/${params.slug}`,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug, active: true },
    include: {
      category: true,
      variants: { orderBy: { size: "asc" } },
    },
  });

  if (!product) notFound();

  // Related products
  const related = await prisma.product.findMany({
    where: {
      active: true,
      categoryId: product.categoryId,
      NOT: { id: product.id },
    },
    include: {
      category: true,
      variants: { where: { inStock: true }, orderBy: { pricePerCube: "asc" } },
    },
    take: 4,
  });

  const minVariant = product.variants.find(v => v.inStock && v.pricePerCube);
  const schemaOrg = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `${product.name} от производителя в Химках`,
    "image": product.images,
    "brand": { "@type": "Brand", "name": "ПилоРус" },
    "offers": {
      "@type": "Offer",
      "url": `https://pilo-rus.ru/product/${product.slug}`,
      "priceCurrency": "RUB",
      "price": minVariant ? Number(minVariant.pricePerCube) : undefined,
      "availability": product.variants.some(v => v.inStock)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "seller": { "@type": "Organization", "name": "ООО ПИТИ (ПилоРус)" },
    },
  };

  return (
    <div className="container py-8">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      {/* Main product section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
        {/* Gallery */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Main image */}
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted border border-border">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Package className="w-16 h-16 opacity-30" />
              </div>
            )}
            {product.variants.some((v) => v.inStock) && (
              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                В наличии
              </span>
            )}
          </div>

          {/* Thumbnail strip */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary transition-colors">
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product info + variant selector */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={product.category.sortOrder < 900 ? `/catalog?category=${product.category.slug}` : "/catalog"}
                aria-label={product.category.sortOrder < 900 ? product.category.name : "Каталог"}
                className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={product.category.sortOrder < 900 ? `/catalog?category=${product.category.slug}` : "/catalog"}
                className="text-sm text-primary hover:underline"
              >
                {product.category.sortOrder < 900 ? product.category.name : "Каталог"}
              </Link>
            </div>
            <h1 className="font-display font-bold text-3xl mt-1 mb-2">{product.name}</h1>
            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Quick features */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Производитель", sub: "Без посредников", icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 22V9L12 3L22 9V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 22h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 22v-7h6v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )},
              { label: "ГОСТ", sub: "Сертифицировано", icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L3.5 6.5V12C3.5 16.7 7.3 21.1 12 22.5C16.7 21.1 20.5 16.7 20.5 12V6.5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )},
              { label: "Доставка", sub: "1–3 дня по МО", icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 4h13v13H1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M14 9h4.5L22 13v4h-8V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="5" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
              )},
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/40 border border-border/60 gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Variant selector */}
          <VariantSelector
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            productImage={product.images[0]}
            saleUnit={product.saleUnit}
            variants={product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
              pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
              piecesPerCube: v.piecesPerCube,
              inStock: v.inStock,
            }))}
          />

          {/* Delivery info */}
          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
            {[
              { label: "Доставка по Москве и МО", value: "1–3 рабочих дня", icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 4h13v13H1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M14 9h4.5L22 13v4h-8V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="5" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
              )},
              { label: "Самовывоз", value: "Химки, Заводская 2А, стр.28", icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
              )},
              { label: "Оплата", value: "Наличные, безнал, счёт с НДС", icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.5"/><path d="M6 15h4M16 15h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              )},
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center gap-3 px-4 py-3 text-sm ${i > 0 ? "border-t border-border/50" : ""}`}>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">{item.label} — </span>
                  <span className="font-medium">{item.value}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-border/50 px-4 py-3 bg-primary/5">
              <a href="tel:+79859707133" className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                <Phone className="w-4 h-4" />
                8-985-970-71-33 — уточнить наличие и цену
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* All variants — card grid */}
      {product.variants.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-2xl">Цены и размеры</h2>
            <span className="text-sm text-muted-foreground">{product.variants.length} вариантов</span>
          </div>
          <VariantCards
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            productImage={product.images[0]}
            saleUnit={product.saleUnit}
            variants={product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
              pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
              piecesPerCube: v.piecesPerCube,
              inStock: v.inStock,
            }))}
          />
        </section>
      )}

      {/* Description accordion */}
      <section className="mb-16">
        <DescriptionAccordion
          name={product.name}
          category={product.category.name}
          description={product.description}
        />
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-2xl mb-6">Похожие товары</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                category={product.category.name}
                images={product.images}
                saleUnit={product.saleUnit}
                variants={product.variants.map((v) => ({
                  id: v.id,
                  size: v.size,
                  pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
                  pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
                  piecesPerCube: v.piecesPerCube,
                  inStock: v.inStock,
                }))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
