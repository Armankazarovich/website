import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://pilo-rus.ru";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                    priority: 1.0, changeFrequency: "weekly"  },
    { url: `${BASE}/catalog`,       priority: 0.9, changeFrequency: "daily"   },
    { url: `${BASE}/calculator`,    priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/news`,          priority: 0.8, changeFrequency: "weekly"  },
    { url: `${BASE}/services`,      priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/about`,         priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/delivery`,      priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/contacts`,      priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/promotions`,    priority: 0.6, changeFrequency: "weekly"  },
    { url: `${BASE}/terms`,         priority: 0.3, changeFrequency: "yearly"  },
  ];

  const [categories, products, posts, services] = await Promise.all([
    prisma.category.findMany({
      where: { showInMenu: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { active: true, category: { showInMenu: true } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/catalog/${c.slug}`,
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

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/news/${p.slug}`,
    lastModified: p.updatedAt,
    priority: 0.75,
    changeFrequency: "monthly" as const,
  }));

  // Services all share one page, just include it once if there are any
  const uniqueServiceRoutes: MetadataRoute.Sitemap = services.length > 0
    ? [{ url: `${BASE}/services`, priority: 0.8, changeFrequency: "monthly" as const }]
    : [];

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...postRoutes, ...uniqueServiceRoutes];
}
