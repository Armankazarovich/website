import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSiteSetting, upsertSiteSetting } from "@/lib/tenant-settings";
import {
  getDefaultProductTypes,
  getAvailableTypes,
  type ProductTypeInfo,
} from "@/lib/product-types";

export const PRODUCT_TYPE_SETTINGS_KEY = "product_type_settings";

export type ProductTypeOverride = {
  label?: string;
  active?: boolean;
  sortOrder?: number;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ProductTypeSettings = Record<string, ProductTypeOverride>;

function cleanText(value: unknown, max = 2400): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

export async function getProductTypeSettings(): Promise<ProductTypeSettings> {
  const row = await getSiteSetting(PRODUCT_TYPE_SETTINGS_KEY);
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function applyProductTypeSettings(
  types: ProductTypeInfo[],
  settings: ProductTypeSettings,
  options: { includeInactive?: boolean } = {},
): ProductTypeInfo[] {
  const defaults = new Map(getDefaultProductTypes().map((type) => [type.keyword, type]));

  return types
    .map((type, index) => {
      const base = defaults.get(type.keyword) ?? type;
      const override = settings[type.keyword] ?? {};
      const active = override.active ?? base.active ?? true;
      const hasDescription = Object.prototype.hasOwnProperty.call(override, "description");
      const hasSeoTitle = Object.prototype.hasOwnProperty.call(override, "seoTitle");
      const hasSeoDescription = Object.prototype.hasOwnProperty.call(override, "seoDescription");
      return {
        ...base,
        ...type,
        label: cleanText(override.label, 80) ?? base.label ?? type.label,
        active,
        sortOrder: typeof override.sortOrder === "number" ? override.sortOrder : base.sortOrder ?? index,
        description: hasDescription ? cleanText(override.description, 2400) : base.description ?? null,
        seoTitle: hasSeoTitle ? cleanText(override.seoTitle, 120) : base.seoTitle ?? null,
        seoDescription: hasSeoDescription ? cleanText(override.seoDescription, 220) : base.seoDescription ?? null,
      };
    })
    .filter((type) => options.includeInactive || type.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, "ru"));
}

export function getConfiguredProductType(
  keyword: string,
  settings: ProductTypeSettings,
): ProductTypeInfo | null {
  const type = getDefaultProductTypes().find((item) => item.keyword === keyword);
  if (!type) return null;
  return applyProductTypeSettings([type], settings, { includeInactive: true })[0] ?? null;
}

export function getManagedProductTypes(
  productNames: string[],
  settings: ProductTypeSettings,
  options: { includeInactive?: boolean } = {},
): ProductTypeInfo[] {
  return applyProductTypeSettings(getAvailableTypes(productNames), settings, options);
}

export async function saveProductTypeSettings(items: Array<ProductTypeInfo & { count?: number }>) {
  const allowed = new Set(getDefaultProductTypes().map((type) => type.keyword));
  const settings: ProductTypeSettings = {};

  items.forEach((item, index) => {
    if (!allowed.has(item.keyword)) return;
    settings[item.keyword] = {
      label: cleanText(item.label, 80) ?? undefined,
      active: item.active !== false,
      sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index,
      description: cleanText(item.description, 2400),
      seoTitle: cleanText(item.seoTitle, 120),
      seoDescription: cleanText(item.seoDescription, 220),
    };
  });

  await upsertSiteSetting(PRODUCT_TYPE_SETTINGS_KEY, JSON.stringify(settings));

  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/sitemap.xml");
  return settings;
}
