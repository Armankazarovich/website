export const revalidate = 60;
import React, { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSiteSetting } from "@/lib/tenant-settings";
import { VariantSelector } from "@/components/store/variant-selector";
import { VariantCards } from "@/components/store/variant-cards";
import { ProductCard } from "@/components/store/product-card";
import { DescriptionAccordion } from "@/components/store/description-accordion";
import { Phone, ArrowLeft, ExternalLink, Calculator } from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { AdminEditButton } from "@/components/admin/admin-edit-button";
import { CompareButton } from "@/components/store/compare-button";
import { WishlistButton } from "@/components/store/wishlist-button";
import { ProductShareButton } from "@/components/store/product-page-actions";
import type { CompareItem } from "@/store/compare";
import { getSiteSettingsForTenant, getSetting, getPhones } from "@/lib/site-settings";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { getProductEditTarget, getPublicEditTarget } from "@/lib/public-edit-targets";
import { getProductAvailability } from "@/lib/product-availability";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";
import { getUnitLabel, saleUnitAllows } from "@/lib/product-units";
// ReviewForm is now rendered inside DescriptionAccordion

interface Props {
  params: { slug: string };
}

function productIntro(description?: string | null) {
  const text = (description || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= 260) return text;
  const firstSentence = text.match(/^.+?[.!?](\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length >= 90 && firstSentence.length <= 260) {
    return firstSentence;
  }
  return `${text.slice(0, 240).trim()}...`;
}

function compactMetaDescription(...parts: Array<string | null | undefined>) {
  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= 170) return text;
  return `${text.slice(0, 167).trim()}...`;
}

function absoluteSiteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `https://pilo-rus.ru${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function productSku(slug: string, id: string) {
  const cleanSlug = slug
    .toUpperCase()
    .replace(/[^A-Z0-9А-ЯЁ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 34);
  return `PR-${cleanSlug || id.slice(-6).toUpperCase()}`;
}

const getProductBySlug = cache(async (slug: string) =>
  prisma.product.findFirst({
    where: { tenantId: DEFAULT_TENANT_ID, slug, ...getPublicProductsFilter() },
    include: {
      category: true,
      variants: { where: getPublicVariantsFilter(), orderBy: [{ size: "asc" }, { pricePerSquareMeter: "asc" }] },
    },
  })
);

function toPrice(value: unknown) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function parseTimberSize(size?: string | null) {
  const match = (size || "").match(/(\d+(?:[.,]\d+)?)\s*[×xXхХ]\s*(\d+(?:[.,]\d+)?)\s*[×xXхХ]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const [, thickness, width, length] = match;
  return {
    thickness: Number(thickness.replace(",", ".")),
    width: Number(width.replace(",", ".")),
    length: Number(length.replace(",", ".")),
  };
}

function formatMeterLength(mm: number) {
  const meters = mm / 1000;
  return `${meters.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} м`;
}

function getDimensionFacts(variants: Array<{ size?: string | null }>) {
  const parsed = variants
    .map((variant) => parseTimberSize(variant.size))
    .filter((size): size is { thickness: number; width: number; length: number } =>
      Boolean(size && Number.isFinite(size.thickness) && Number.isFinite(size.width) && Number.isFinite(size.length))
    );

  if (parsed.length === 0) return [];

  const lengths = Array.from(new Set(parsed.map((size) => size.length))).sort((a, b) => a - b);
  const sections = Array.from(new Set(parsed.map((size) => `${size.thickness}×${size.width}`)));
  const facts: string[] = [];

  if (lengths.length === 1) {
    facts.push(`Длина ${formatMeterLength(lengths[0])}`);
  } else if (lengths.length > 1) {
    facts.push(`Длины ${formatMeterLength(lengths[0])}–${formatMeterLength(lengths[lengths.length - 1])}`);
  }

  if (sections.length > 0) {
    facts.push(`${sections.length.toLocaleString("ru-RU")} сечений`);
  }

  if (variants.length > 0) {
    facts.push(`${variants.length.toLocaleString("ru-RU")} размеров`);
  }

  return facts.slice(0, 3);
}

function getPreferredPriceInfo(
  product: { saleUnit: string; variants: Array<{ pricePerCube: unknown; pricePerPiece: unknown; pricePerSquareMeter?: unknown }> },
) {
  const cubePrices = product.variants.map((variant) => toPrice(variant.pricePerCube)).filter((price): price is number => price !== null);
  const piecePrices = product.variants.map((variant) => toPrice(variant.pricePerPiece)).filter((price): price is number => price !== null);
  const squarePrices = product.variants.map((variant) => toPrice(variant.pricePerSquareMeter)).filter((price): price is number => price !== null);

  if (saleUnitAllows(product.saleUnit, "CUBE") && cubePrices.length > 0) {
    return { prices: cubePrices, unit: getUnitLabel("CUBE") };
  }
  if (saleUnitAllows(product.saleUnit, "SQUARE") && squarePrices.length > 0) {
    return { prices: squarePrices, unit: getUnitLabel("SQUARE") };
  }
  if (piecePrices.length > 0) {
    return { prices: piecePrices, unit: getUnitLabel("PIECE") };
  }
  if (cubePrices.length > 0) {
    return { prices: cubePrices, unit: getUnitLabel("CUBE") };
  }
  if (squarePrices.length > 0) {
    return { prices: squarePrices, unit: getUnitLabel("SQUARE") };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);

  if (!product) return { title: "Товар не найден" };

  const priceInfo = getPreferredPriceInfo(product);
  const minPrice = priceInfo
    ? `от ${Math.min(...priceInfo.prices).toLocaleString("ru-RU")} ₽/${priceInfo.unit}`
    : "";
  const intro = productIntro(product.shortDescription || product.description);
  const seoDescription = compactMetaDescription(
    intro || `${product.name} от производителя в Химках.`,
    minPrice ? `${minPrice}.` : "",
    "Доставка по Москве и МО за 1-3 дня. ГОСТ, помощь с расчетом."
  );

  return {
    title: `${product.name} ${minPrice} — купить в Химках с доставкой`,
    description: seoDescription,
    keywords: `${product.name}, купить ${product.name}, ${product.name} цена, ${product.name} Москва, ${product.name} Химки, пиломатериалы от производителя`,
    openGraph: {
      title: `${product.name} — ПилоРус`,
      description: seoDescription,
      url: `https://pilo-rus.ru/product/${params.slug}`,
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
  const productPromise = getProductBySlug(params.slug);
  const siteSettingsPromise = getSiteSettingsForTenant(DEFAULT_TENANT_ID);
  const yandexMapsSettingPromise = getSiteSetting("yandex_maps_review_url", DEFAULT_TENANT_ID);

  const product = await productPromise;

  if (!product) notFound();

  const relatedPromise = prisma.product.findMany({
    where: {
      tenantId: DEFAULT_TENANT_ID,
      ...getPublicProductsFilter(),
      categoryId: product.categoryId,
      NOT: { id: product.id },
    },
    include: {
      category: true,
      variants: { where: getPublicVariantsFilter(), orderBy: [{ pricePerCube: "asc" }, { pricePerSquareMeter: "asc" }, { pricePerPiece: "asc" }] },
    },
    take: 4,
  });

  // Reviews for aggregateRating + display block
  // NOTE: do NOT include user relation here — avatarUrl may not exist on all deployments
  const reviewsPromise = prisma.review.findMany({
    where: { approved: true, productId: product.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const [siteSettings, yandexMapsSetting, related, reviews] = await Promise.all([
    siteSettingsPromise,
    yandexMapsSettingPromise,
    relatedPromise,
    reviewsPromise,
  ]);
  const yandexMapsUrl = yandexMapsSetting?.value || "";
  const showReviewsBlock = (siteSettings.product_page_show_reviews ?? "true") !== "false";
  const showRelatedProducts = (siteSettings.product_page_show_related ?? "true") !== "false";
  const showCalculatorLink = (siteSettings.product_page_show_calculator ?? "true") !== "false";
  const showBreadcrumbs = (siteSettings.product_page_show_breadcrumbs ?? "true") !== "false";
  const phonesList = getPhones(siteSettings);
  const firstPhoneLink = phonesList[0]?.tel || getSetting(siteSettings, "phone_link");
  const firstPhoneDisplay = phonesList[0]?.display || getSetting(siteSettings, "phone");
  const companyName = getSetting(siteSettings, "company_name") || "ООО «ДЕРЕВОЛИДЕР»";

  const intro = productIntro(product.shortDescription || product.description);
  const productEditTarget = getProductEditTarget(product.id);
  const relatedEditTarget = getPublicEditTarget("product.related");
  const compareItem: CompareItem = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category.name,
    shortDescription: product.shortDescription,
    description: product.description,
    images: product.images,
    cardTags: product.cardTags,
    saleUnit: product.saleUnit as CompareItem["saleUnit"],
    variants: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      pricePerCube: variant.pricePerCube ? Number(variant.pricePerCube) : null,
      pricePerSquareMeter: variant.pricePerSquareMeter ? Number(variant.pricePerSquareMeter) : null,
      pricePerPiece: variant.pricePerPiece ? Number(variant.pricePerPiece) : null,
      piecesPerCube: variant.piecesPerCube,
      inStock: variant.inStock,
      stockQty: variant.stockQty,
      lowStockThreshold: variant.lowStockThreshold,
    })),
  };
  const productUrl = `/product/${product.slug}`;
  const sku = productSku(product.slug, product.id);
  const dimensionFacts = getDimensionFacts(product.variants);

  // Build schema.org structured data. Keep low/high prices in one unit:
  // cube prices for m3 catalog items, piece prices for piece-only items.
  const productAvailability = getProductAvailability(product.variants);
  const preferredPrices = getPreferredPriceInfo(product);
  const priceSource = preferredPrices?.prices ?? [];
  const lowPrice = priceSource.length > 0 ? Math.min(...priceSource) : undefined;
  const highPrice = priceSource.length > 0 ? Math.max(...priceSource) : undefined;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const schemaOrg: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "sku": sku,
    "category": product.category.name,
    "description": product.description || product.shortDescription || `${product.name} от производителя в Химках`,
    "image": product.images.length > 0 ? product.images.map(absoluteSiteUrl) : undefined,
    "brand": { "@type": "Brand", "name": "ПилоРус" },
    "offers": {
      "@type": "AggregateOffer",
      "url": `https://pilo-rus.ru/product/${product.slug}`,
      "priceCurrency": "RUB",
      ...(lowPrice !== undefined ? { "lowPrice": lowPrice } : {}),
      ...(highPrice !== undefined ? { "highPrice": highPrice } : {}),
      "offerCount": product.variants.length,
      "availability": productAvailability.schemaAvailability,
      "seller": { "@type": "Organization", "name": `${companyName} (ПилоРус)` },
    },
  };

  if (showReviewsBlock && avgRating && reviews.length > 0) {
    schemaOrg["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1",
    };
    schemaOrg["review"] = reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      "author": { "@type": "Person", "name": review.name },
      "datePublished": review.createdAt.toISOString(),
      "reviewBody": review.text,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": "5",
        "worstRating": "1",
      },
    }));
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://pilo-rus.ru/" },
      { "@type": "ListItem", "position": 2, "name": "Каталог", "item": "https://pilo-rus.ru/catalog" },
      ...(product.category.sortOrder < 900 ? [{
        "@type": "ListItem", "position": 3, "name": product.category.name,
        "item": `https://pilo-rus.ru/catalog?category=${product.category.slug}`,
      }] : []),
      { "@type": "ListItem", "position": product.category.sortOrder < 900 ? 4 : 3, "name": product.name },
    ],
  };

  return (
    <div className="container py-6 sm:py-8">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Main product section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-16">
        {/* Gallery */}
        <div className="store-product-gallery-wrap lg:sticky lg:top-24 lg:self-start">
          <ProductGallery
            images={product.images}
            name={product.name}
            availability={productAvailability}
          />
        </div>

        {/* Product info + variant selector */}
        <div className="space-y-6">
          <div className="store-product-heading">
            {showBreadcrumbs && (
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={product.category.sortOrder < 900 ? `/catalog?category=${product.category.slug}` : "/catalog"}
                aria-label={product.category.sortOrder < 900 ? product.category.name : "Каталог"}
                className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-border/55 bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={product.category.sortOrder < 900 ? `/catalog?category=${product.category.slug}` : "/catalog"}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {product.category.sortOrder < 900 ? product.category.name : "Каталог"}
              </Link>
            </div>
            )}
            <h1 className="store-product-title font-display text-3xl sm:text-4xl mt-1 mb-3">{product.name}</h1>
            {intro && (
              <p className="store-product-intro text-muted-foreground leading-relaxed">{intro}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CompareButton item={compareItem} mode="inline" />
              <WishlistButton item={compareItem} mode="inline" />
              <ProductShareButton title={product.name} url={productUrl} />
              <AdminEditButton
                href={productEditTarget.adminHref}
                mode="inline"
                label={productEditTarget.adminLabel}
                className="min-h-[40px] rounded-xl px-3 text-sm font-semibold"
              />
            </div>
          </div>

          {/* Quick features */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
              <div key={f.label} className="store-feature-card flex flex-col items-center text-center p-3 rounded-xl border gap-2">
                <div className="store-icon-tile w-9 h-9 rounded-xl shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {dimensionFacts.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {dimensionFacts.map((fact) => (
                <div key={fact} className="rounded-xl border border-border/60 bg-card/70 px-3 py-2.5 text-center">
                  <p className="text-sm font-semibold leading-tight">{fact}</p>
                </div>
              ))}
            </div>
          )}

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
              pricePerSquareMeter: v.pricePerSquareMeter ? Number(v.pricePerSquareMeter) : null,
              pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
              piecesPerCube: v.piecesPerCube,
              inStock: v.inStock,
              stockQty: v.stockQty,
              lowStockThreshold: v.lowStockThreshold,
            }))}
            phoneLink={firstPhoneLink}
          />

          {/* Calculator link */}
          {showCalculatorLink && (
            <Link href="/calculator" className="flex items-center gap-2 text-sm text-primary hover:underline mt-2">
              <Calculator className="w-4 h-4" />
              Рассчитать точное количество в калькуляторе
            </Link>
          )}

          {/* Delivery info */}
          <div className="store-delivery-panel rounded-2xl border overflow-hidden">
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
                <div className="store-icon-tile w-7 h-7 rounded-xl shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">{item.label} — </span>
                  <span className="font-medium">{item.value}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-border/50 px-4 py-3 bg-primary/5">
              <a href={`tel:${firstPhoneLink}`} className="flex items-start gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                <Phone className="mt-0.5 w-4 h-4 shrink-0" />
                <span className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                  <span>{firstPhoneDisplay}</span>
                  <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Ответим быстро, поможем с расчётом и доставкой
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* All variants — card grid */}
      {product.variants.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-extrabold text-2xl">Цены и размеры</h2>
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
              pricePerSquareMeter: v.pricePerSquareMeter ? Number(v.pricePerSquareMeter) : null,
              pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
              piecesPerCube: v.piecesPerCube,
              inStock: v.inStock,
              stockQty: v.stockQty,
              lowStockThreshold: v.lowStockThreshold,
            }))}
          />
        </section>
      )}

      {/* Unified accordion: Description + Reviews + Review form */}
      <section className="mb-16">
        <DescriptionAccordion
          name={product.name}
          category={product.category.name}
          categorySlug={product.category.slug}
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
          userName={null}
          userEmail={null}
          userAvatar={null}
          isLoggedIn={false}
        />
      </section>

      {/* Yandex Maps review widget */}
      {yandexMapsUrl && (
        <section className="mb-16">
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-foreground text-xs font-bold shrink-0">
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
              className="px-3 py-1.5 rounded-xl bg-card text-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 inline-flex items-center gap-1"
            >
              Написать
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>
      )}

      {/* Related products */}
      {showRelatedProducts && related.length > 0 && (
        <section className="group/related">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold">Похожие товары</h2>
            <AdminEditButton
              href={relatedEditTarget.adminHref}
              mode="inline"
              label={relatedEditTarget.adminLabel}
              className="hidden shrink-0 sm:inline-flex"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                category={product.category.name}
                shortDescription={product.shortDescription}
                description={product.description}
                images={product.images}
                cardTags={product.cardTags}
                saleUnit={product.saleUnit}
                variants={product.variants.map((v) => ({
                  id: v.id,
                  size: v.size,
                  pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
                  pricePerSquareMeter: v.pricePerSquareMeter ? Number(v.pricePerSquareMeter) : null,
                  pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
                  piecesPerCube: v.piecesPerCube,
                  inStock: v.inStock,
                  stockQty: v.stockQty,
                  lowStockThreshold: v.lowStockThreshold,
                }))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
