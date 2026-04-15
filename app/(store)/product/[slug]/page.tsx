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
import { Phone, ArrowLeft, ExternalLink, Calculator, Pencil } from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { auth } from "@/lib/auth";
import { getSiteSettings, getSetting } from "@/lib/site-settings";
// ReviewForm is now rendered inside DescriptionAccordion

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
  // Check if admin is viewing — to show edit button
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = session && ["ADMIN", "MANAGER"].includes(role);

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

  // Reviews for aggregateRating + display block
  const reviews = await prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Site settings + Yandex Maps review URL + show_reviews_block setting
  const [siteSettings, yandexMapsSetting, showReviewsSetting] = await Promise.all([
    getSiteSettings(),
    prisma.siteSettings.findUnique({ where: { key: "yandex_maps_review_url" } }),
    prisma.siteSettings.findUnique({ where: { key: "product_page_show_reviews" } }),
  ]);
  const yandexMapsUrl = yandexMapsSetting?.value || "";
  const showReviewsBlock = showReviewsSetting?.value !== "false";

  // Messenger settings
  const whatsappEnabled = getSetting(siteSettings, "whatsapp_enabled") === "true";
  const whatsappNumber = getSetting(siteSettings, "whatsapp_number");
  const waMessage = `Здравствуйте! Хочу заказать: ${product.name}\nhttps://pilo-rus.ru/product/${product.slug}`;
  const telegramEnabled = getSetting(siteSettings, "telegram_enabled") === "true";
  const telegramUsername = getSetting(siteSettings, "telegram_username");
  const tgMessage = getSetting(siteSettings, "telegram_message") || `Здравствуйте! Хочу заказать: ${product.name}`;
  const telegramLink = telegramUsername
    ? `https://t.me/${telegramUsername.replace("@", "")}?text=${encodeURIComponent(tgMessage)}`
    : null;

  // Build schema.org structured data
  const inStockVariants = product.variants.filter(v => v.inStock);
  const allPricesCube = product.variants
    .filter(v => v.pricePerCube)
    .map(v => Number(v.pricePerCube));
  const allPricesPiece = product.variants
    .filter(v => v.pricePerPiece)
    .map(v => Number(v.pricePerPiece));
  const allPrices = [...allPricesCube, ...allPricesPiece];
  const lowPrice = allPrices.length > 0 ? Math.min(...allPrices) : undefined;
  const highPrice = allPrices.length > 0 ? Math.max(...allPrices) : undefined;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const schemaOrg: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `${product.name} от производителя в Химках`,
    "image": product.images.length > 0 ? product.images : undefined,
    "brand": { "@type": "Brand", "name": "ПилоРус" },
    "offers": {
      "@type": "AggregateOffer",
      "url": `https://pilo-rus.ru/product/${product.slug}`,
      "priceCurrency": "RUB",
      ...(lowPrice !== undefined ? { "lowPrice": lowPrice } : {}),
      ...(highPrice !== undefined ? { "highPrice": highPrice } : {}),
      "offerCount": product.variants.length,
      "availability": inStockVariants.length > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "seller": { "@type": "Organization", "name": "ООО ПИТИ (ПилоРус)" },
    },
  };

  if (avgRating && reviews.length > 0) {
    schemaOrg["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1",
    };
  }

  return (
    <div className="container py-8">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      {/* ── Admin floating edit button ── */}
      {isAdmin && (
        <Link
          href={`/admin/products/${product.id}`}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-xl hover:bg-primary/90 hover:shadow-2xl transition-all duration-200 font-semibold text-sm group"
          title="Редактировать товар в админке"
        >
          <Pencil className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span>Редактировать</span>
        </Link>
      )}

      {/* Main product section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-16">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery
            images={product.images}
            name={product.name}
            inStock={product.variants.some(v => v.inStock)}
          />
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

          {/* Messenger order buttons */}
          {(whatsappEnabled || (telegramEnabled && telegramLink)) && (
            <div className="flex flex-col gap-2">
              {whatsappEnabled && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl border-2 border-[#25D366]/40 bg-[#25D366]/8 text-[#25D366] font-semibold text-sm hover:bg-[#25D366]/15 hover:border-[#25D366]/60 transition-all active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Заказать через WhatsApp
                </a>
              )}
              {telegramEnabled && telegramLink && (
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl border-2 border-[#2AABEE]/40 bg-[#2AABEE]/8 text-[#2AABEE] font-semibold text-sm hover:bg-[#2AABEE]/15 hover:border-[#2AABEE]/60 transition-all active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                  Заказать через Telegram
                </a>
              )}
            </div>
          )}

          {/* Calculator link */}
          <Link href="/calculator" className="flex items-center gap-2 text-sm text-primary hover:underline mt-2">
            <Calculator className="w-4 h-4" />
            Рассчитать точное количество в калькуляторе
          </Link>

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
              <a href={`tel:${getSetting(siteSettings, "phone_link")}`} className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                <Phone className="w-4 h-4" />
                {getSetting(siteSettings, "phone")} — уточнить наличие и цену
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

      {/* Unified accordion: Description + Reviews + Review form */}
      <section className="mb-16">
        <DescriptionAccordion
          name={product.name}
          category={product.category.name}
          description={product.description}
          reviews={reviews.map((r) => ({
            id: r.id,
            name: r.name,
            rating: r.rating,
            text: r.text || "",
            images: (r as any).images || [],
            likes: (r as any).likes || 0,
            dislikes: (r as any).dislikes || 0,
            adminReply: (r as any).adminReply || null,
            createdAt: r.createdAt.toISOString(),
          }))}
          showReviews={showReviewsBlock}
          productId={product.id}
          productName={product.name}
          userName={session?.user?.name || null}
          userEmail={session?.user?.email || null}
          userAvatar={(session?.user as any)?.avatarUrl || null}
          isLoggedIn={!!session?.user}
        />
      </section>

      {/* Yandex Maps review widget */}
      {yandexMapsUrl && (
        <section className="mb-16">
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-[#FC3F1D] flex items-center justify-center text-white text-xs font-bold shrink-0">
              Я
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Оставьте отзыв в Яндекс Картах</p>
              <p className="text-xs text-muted-foreground">Помогите другим покупателям выбрать нас</p>
            </div>
            <a
              href={yandexMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#FC3F1D] text-white text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 inline-flex items-center gap-1"
            >
              Написать
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-2xl mb-6">Похожие товары</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
