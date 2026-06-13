import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicProductsFilter } from "@/lib/product-seo";
import { getManagedProductTypes, getProductTypeSettings } from "@/lib/product-type-settings";

const BASE = "https://pilo-rus.ru";
const LAUNCH_LAST_MODIFIED = new Date("2026-06-13T00:00:00.000Z");

// Keep sitemap fresh when managers publish products without forcing a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                    lastModified: LAUNCH_LAST_MODIFIED, priority: 1.0, changeFrequency: "weekly"  },
    { url: `${BASE}/catalog`,       lastModified: LAUNCH_LAST_MODIFIED, priority: 0.9, changeFrequency: "daily"   },
    { url: `${BASE}/calculator`,    lastModified: LAUNCH_LAST_MODIFIED, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/news`,          lastModified: LAUNCH_LAST_MODIFIED, priority: 0.8, changeFrequency: "weekly"  },
    { url: `${BASE}/services`,      lastModified: LAUNCH_LAST_MODIFIED, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/about`,         lastModified: LAUNCH_LAST_MODIFIED, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/delivery`,      lastModified: LAUNCH_LAST_MODIFIED, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/contacts`,      lastModified: LAUNCH_LAST_MODIFIED, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/promotions`,    lastModified: LAUNCH_LAST_MODIFIED, priority: 0.6, changeFrequency: "weekly"  },
    { url: `${BASE}/terms`,         lastModified: LAUNCH_LAST_MODIFIED, priority: 0.3, changeFrequency: "yearly"  },
  ];

  const [categories, products, posts, services, productTypeSettings] = await Promise.all([
    prisma.category.findMany({
      where: { showInMenu: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { ...getPublicProductsFilter(), category: { showInMenu: true } },
      select: {
        slug: true,
        name: true,
        updatedAt: true,
        category: { select: { slug: true, updatedAt: true } },
      },
    }),
    prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    getProductTypeSettings(),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/catalog?category=${c.slug}`,
    lastModified: c.updatedAt,
    priority: 0.85,
    changeFrequency: "weekly" as const,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/product/${p.slug}`,
    lastModified: p.updatedAt,
    priority: 0.7,
    changeFrequency: "weekly" as const,
  }));

  const productTypeRoutes: MetadataRoute.Sitemap = getManagedProductTypes(
    products.map((p) => p.name),
    productTypeSettings,
  ).map((type) => ({
    url: `${BASE}/catalog?type=${encodeURIComponent(type.keyword)}`,
    priority: 0.82,
    changeFrequency: "weekly" as const,
  }));

  const categoryProducts = new Map<string, { names: string[]; updatedAt: Date }>();
  for (const product of products) {
    const current = categoryProducts.get(product.category.slug) ?? {
      names: [],
      updatedAt: product.category.updatedAt,
    };
    current.names.push(product.name);
    if (product.updatedAt > current.updatedAt) current.updatedAt = product.updatedAt;
    categoryProducts.set(product.category.slug, current);
  }

  const categoryTypeRoutes: MetadataRoute.Sitemap = Array.from(categoryProducts.entries()).flatMap(
    ([slug, data]) =>
      getManagedProductTypes(data.names, productTypeSettings).map((type) => ({
        url: `${BASE}/catalog?category=${encodeURIComponent(slug)}&type=${encodeURIComponent(type.keyword)}`,
        lastModified: data.updatedAt,
        priority: 0.78,
        changeFrequency: "weekly" as const,
      })),
  );

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/news/${p.slug}`,
    lastModified: p.updatedAt,
    priority: 0.75,
    changeFrequency: "monthly" as const,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${BASE}/services/${service.slug}`,
    lastModified: service.updatedAt,
    priority: 0.7,
    changeFrequency: "monthly" as const,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productTypeRoutes,
    ...categoryTypeRoutes,
    ...productRoutes,
    ...postRoutes,
    ...serviceRoutes,
  ];
}
