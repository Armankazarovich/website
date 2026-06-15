import catalog from "@/lib/zaidr-products.json";
import { getMultisiteProfile } from "@/lib/multisite-sites";

export type ZaidrImageStatus =
  | "exact"
  | "supplier-search"
  | "category-ai-ready"
  | "needs-check";

export type ZaidrProduct = {
  sku: string;
  brand: string;
  name: string;
  category: string;
  group: string;
  price: number;
  weight: string;
  box: string;
  ral: string;
  sourceFile: string;
  imageStatus: ZaidrImageStatus;
};

export type ZaidrCategory = {
  name: string;
  count: number;
};

type ZaidrCatalog = {
  generatedAt: string;
  source: string[];
  products: ZaidrProduct[];
  categories: ZaidrCategory[];
};

const data = catalog as ZaidrCatalog;
const siteProfile = getMultisiteProfile("zaidr");

export const ZAIDR_SITE = {
  brand: siteProfile.name,
  title: siteProfile.title,
  domain: siteProfile.domain,
  city: siteProfile.city,
  phoneDisplay: siteProfile.phoneDisplay,
  phoneHref: siteProfile.phoneHref,
  manager: "ARAY Production",
  source: siteProfile.catalogSource,
  delivery: siteProfile.delivery,
  payment: siteProfile.payment,
} as const;

export const ZAIDR_PRODUCTS = data.products;
export const ZAIDR_CATEGORIES = data.categories;
export const ZAIDR_SOURCE_FILES = data.source;

export const ZAIDR_CATEGORY_IMAGES = [
  "/images/production/prod-18.jpg",
  "/images/production/prod-20.jpg",
  "/images/production/prod-21.jpg",
  "/images/production/sklad-2.jpg",
  "/images/production/prod-12.jpg",
  "/images/production/prod-14.jpg",
  "/images/production/prod-16.jpg",
  "/images/production/sklad-4.webp",
] as const;

export const ZAIDR_IMAGE_STATUS_LABELS: Record<ZaidrImageStatus, string> = {
  exact: "точное фото",
  "supplier-search": "ищем по артикулу",
  "category-ai-ready": "AI-визуал по категории",
  "needs-check": "нужно проверить",
};

export function formatZaidrPrice(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getZaidrCategoryImage(index: number) {
  return ZAIDR_CATEGORY_IMAGES[index % ZAIDR_CATEGORY_IMAGES.length];
}

export function buildZaidrImagePrompt(product: ZaidrProduct) {
  return [
    "Предметное фото для интернет-магазина стройматериалов.",
    `Товар: ${product.name}.`,
    `Категория: ${product.category}.`,
    `Бренд: ${product.brand}.`,
    "Чистый светлый фон, реалистичная упаковка без выдуманных логотипов, ракурс 3/4.",
  ].join(" ");
}
