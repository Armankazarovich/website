import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { getCurrentTenantId } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

const ENTITY_TYPES = new Set(["product", "service", "promotion", "review"]);

function clean(value: string | null, max = 80) {
  return (value || "").trim().slice(0, max);
}

function stripHtml(value?: string | null) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max = 170) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}

function money(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function productPrice(product: any) {
  const prices = (product.variants || [])
    .flatMap((variant: any) => [money(variant.pricePerPiece), money(variant.pricePerCube)])
    .filter(Boolean) as number[];
  if (prices.length === 0) return "";
  return `от ${Math.min(...prices).toLocaleString("ru-RU")} ₽`;
}

function productOption(product: any) {
  const image = product.images?.[0] || null;
  const category = product.category?.name || "";
  const price = productPrice(product);
  const shortText = product.shortDescription || stripHtml(product.description);
  return {
    entityType: "product",
    entityId: product.slug,
    label: product.name,
    detail: [category, price].filter(Boolean).join(" · "),
    image,
    ctaLabel: "Открыть товар",
    ctaUrl: `/product/${product.slug}`,
    template: {
      title: `Видео-обзор: ${product.name}`,
      subtitle: category ? `${category}: размер, цена и наличие` : "Размер, цена и наличие",
      description: truncate(
        shortText ||
          `Покажите ${product.name} вживую: материал, размеры, качество поверхности и почему клиенту стоит выбрать этот вариант.`,
      ),
      posterUrl: image,
      ctaLabel: "Открыть товар",
      ctaUrl: `/product/${product.slug}`,
    },
  };
}

function serviceOption(service: any) {
  const image = service.image || null;
  const description = stripHtml(service.description || service.content);
  return {
    entityType: "service",
    entityId: service.slug,
    label: service.title,
    detail: [service.price, service.unit].filter(Boolean).join(" · "),
    image,
    ctaLabel: "Оставить заявку",
    ctaUrl: `/services/${service.slug}`,
    template: {
      title: `Как работает услуга: ${service.title}`,
      subtitle: service.price ? `${service.price}${service.unit ? ` ${service.unit}` : ""}` : "Коротко о процессе и результате",
      description: truncate(description || "Покажите процесс, результат и следующий шаг для клиента."),
      posterUrl: image,
      ctaLabel: "Оставить заявку",
      ctaUrl: `/services/${service.slug}`,
    },
  };
}

function promotionOption(promotion: any) {
  const image = promotion.imageUrl || null;
  return {
    entityType: "promotion",
    entityId: promotion.id,
    label: promotion.title,
    detail: promotion.discount ? `скидка ${promotion.discount}%` : "акция",
    image,
    ctaLabel: "Смотреть акцию",
    ctaUrl: "/promotions",
    template: {
      title: `Акция: ${promotion.title}`,
      subtitle: promotion.discount ? `Скидка ${promotion.discount}%` : "Актуальное предложение",
      description: truncate(promotion.description || "Коротко покажите выгоду, срок действия и как получить предложение."),
      posterUrl: image,
      ctaLabel: "Смотреть акцию",
      ctaUrl: "/promotions",
    },
  };
}

function reviewOption(review: any) {
  const image = review.images?.[0] || review.product?.images?.[0] || null;
  const productSlug = review.product?.slug || "";
  return {
    entityType: "review",
    entityId: review.id,
    label: `${review.name} · ${review.rating}/5`,
    detail: review.product?.name || review.source || "отзыв клиента",
    image,
    ctaLabel: "Смотреть отзыв",
    ctaUrl: productSlug ? `/product/${productSlug}` : "/reviews",
    template: {
      title: `Видео-отзыв: ${review.name}`,
      subtitle: `Оценка ${review.rating}/5${review.product?.name ? ` · ${review.product.name}` : ""}`,
      description: truncate(review.text || "Короткий отзыв клиента после покупки или услуги."),
      posterUrl: image,
      ctaLabel: "Смотреть отзыв",
      ctaUrl: productSlug ? `/product/${productSlug}` : "/reviews",
    },
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const url = new URL(req.url);
  const type = clean(url.searchParams.get("type"), 30);
  const q = clean(url.searchParams.get("q"), 100);
  if (!ENTITY_TYPES.has(type)) return NextResponse.json({ options: [] });

  const contains = q ? { contains: q, mode: "insensitive" as const } : undefined;

  if (type === "product") {
    const products = await prisma.product.findMany({
      where: contains
        ? { tenantId, active: true, OR: [{ name: contains }, { slug: contains }, { shortDescription: contains }] }
        : { tenantId, active: true },
      include: {
        category: { select: { name: true } },
        variants: { select: { pricePerCube: true, pricePerPiece: true }, take: 12 },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 80,
    });
    return NextResponse.json({ options: products.map(productOption) });
  }

  if (type === "service") {
    const services = await prisma.service.findMany({
      where: contains ? { tenantId, active: true, OR: [{ title: contains }, { slug: contains }, { description: contains }] } : { tenantId, active: true },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
      take: 80,
    });
    return NextResponse.json({ options: services.map(serviceOption) });
  }

  if (type === "promotion") {
    const promotions = await prisma.promotion.findMany({
      where: contains ? { tenantId, active: true, OR: [{ title: contains }, { description: contains }] } : { tenantId, active: true },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      take: 80,
    });
    return NextResponse.json({ options: promotions.map(promotionOption) });
  }

  const reviews = await prisma.review.findMany({
    where: contains ? { tenantId, approved: true, OR: [{ name: contains }, { text: contains }, { product: { is: { name: contains } } }] } : { tenantId, approved: true },
    include: { product: { select: { name: true, slug: true, images: true } } },
    orderBy: [{ approved: "desc" }, { createdAt: "desc" }],
    take: 80,
  });
  return NextResponse.json({ options: reviews.map(reviewOption) });
}
