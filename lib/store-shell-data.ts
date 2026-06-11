import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAvailableTypes, type ProductTypeInfo } from "@/lib/product-types";
import { applyProductTypeSettings, getProductTypeSettings } from "@/lib/product-type-settings";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { getPhones, getSetting, getSiteSettings } from "@/lib/site-settings";
import { getCurrentTenantId } from "@/lib/tenant-context";

export type StoreShellCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  _count: { products: number };
  children?: StoreShellCategory[];
};

export type StoreShellFooterCategory = {
  id: string;
  name: string;
  slug: string;
};

export type StoreShellData = {
  categories: StoreShellCategory[];
  footerCategories: StoreShellFooterCategory[];
  siteSettings: Record<string, string>;
  phones: ReturnType<typeof getPhones>;
  workingHours?: string;
  megaMenuTypes: ProductTypeInfo[];
  megaMenuSizes: string[];
  photoAspect: string;
  cardStyle: string;
  arayEnabled: boolean;
};

function extractUniqueCrossSections(sizes: string[]): string[] {
  const set = new Set<string>();
  const separator = "\u00d7";

  for (const size of sizes) {
    const m3 = size.match(
      /^(\d+)\s*[\u00d7xX\u0445\u0425]\s*(\d+)\s*[\u00d7xX\u0445\u0425]\s*\d+/,
    );
    if (m3) {
      set.add(`${m3[1]}${separator}${m3[2]}`);
      continue;
    }

    const m2 = size.match(/^(\d+)\s*[\u00d7xX\u0445\u0425]\s*(\d+)$/);
    if (m2 && parseInt(m2[1], 10) > 5 && parseInt(m2[2], 10) > 5) {
      set.add(`${m2[1]}${separator}${m2[2]}`);
    }
  }

  return Array.from(set).sort((a, b) => {
    const [a1, a2] = a.split(separator).map(Number);
    const [b1, b2] = b.split(separator).map(Number);
    return a1 - b1 || a2 - b2;
  });
}

const getCachedStoreShellData = unstable_cache(
  async (tenantId: string): Promise<StoreShellData> => {
    const publicProductFilter = { tenantId, ...getPublicProductsFilter() };
    const publicVariantFilter = getPublicVariantsFilter();
    const [
      categories,
      footerCategories,
      siteSettings,
      productTypeSettings,
      productNames,
      variantSizes,
    ] = await Promise.all([
      prisma.category.findMany({
        where: {
          tenantId,
          showInMenu: true,
          parentId: null,
          OR: [
            { products: { some: publicProductFilter } },
            { children: { some: { tenantId, showInMenu: true, products: { some: publicProductFilter } } } },
          ],
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          _count: { select: { products: { where: publicProductFilter } } },
          children: {
            where: { tenantId, showInMenu: true, products: { some: publicProductFilter } },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              _count: { select: { products: { where: publicProductFilter } } },
            },
          },
        },
      }),
      prisma.category.findMany({
        where: { tenantId, showInFooter: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      getSiteSettings(),
      getProductTypeSettings(),
      prisma.product.findMany({
        where: { ...publicProductFilter, category: { tenantId, showInMenu: true } },
        select: { name: true },
      }),
      prisma.productVariant.findMany({
        where: {
          product: { ...publicProductFilter, category: { tenantId, showInMenu: true } },
          ...publicVariantFilter,
        },
        select: { size: true },
        distinct: ["size"],
      }),
    ]);

    return {
      categories,
      footerCategories,
      siteSettings,
      phones: getPhones(siteSettings),
      workingHours: getSetting(siteSettings, "working_hours") || undefined,
      megaMenuTypes: applyProductTypeSettings(
        getAvailableTypes(productNames.map((product) => product.name)),
        productTypeSettings,
      ),
      megaMenuSizes: extractUniqueCrossSections(
        variantSizes.map((variant) => variant.size),
      ),
      photoAspect: getSetting(siteSettings, "photo_aspect_ratio") || "1/1",
      cardStyle: getSetting(siteSettings, "card_style") || "classic",
      arayEnabled: getSetting(siteSettings, "aray_enabled") !== "false",
    };
  },
  ["store-shell-data-v1"],
  { revalidate: 60, tags: ["store-shell-data"] },
);

export function getStoreShellData() {
  return getCachedStoreShellData(getCurrentTenantId());
}
