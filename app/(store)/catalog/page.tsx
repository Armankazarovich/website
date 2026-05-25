export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAvailableTypes, findTypeByKeyword, extractProductType, getTypeGroupKeywords } from "@/lib/product-types";
import {
  applyProductTypeSettings,
  getConfiguredProductType,
  getProductTypeSettings,
} from "@/lib/product-type-settings";
import { ProductCard } from "@/components/store/product-card";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { CatalogTypeFilter } from "@/components/store/catalog-type-filter";
import { CatalogMobileFilter } from "@/components/store/catalog-mobile-filter";
import { CatalogViewMemory } from "@/components/store/catalog-view-memory";
import { InstockToggle } from "@/components/store/instock-toggle";
import {
  Calculator,
  ArrowRight,
  SearchX,
  PackageCheck,
  BadgeCheck,
  Truck,
  SlidersHorizontal,
  Monitor,
  LayoutList,
  Columns2,
  Grid3x3,
  LayoutGrid,
} from "lucide-react";
import { getSiteSettings, getPhones } from "@/lib/site-settings";
import { PhoneLinks } from "@/components/shared/phone-links";
import { RoutePrefetcher } from "@/components/shared/route-prefetcher";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { getProductAvailability } from "@/lib/product-availability";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const robots = getCatalogRobots(searchParams);
  if (searchParams.search) {
    const query = searchParams.search.trim();
    return {
      title: `Поиск «${query}» — каталог ПилоРус`,
      description: `Результаты поиска по каталогу ПилоРус: ${query}. Пиломатериалы от производителя в Химках с доставкой по Москве и МО.`,
      alternates: { canonical: `https://pilo-rus.ru/catalog?search=${encodeURIComponent(query)}` },
      robots,
    };
  }
  if (searchParams.type) {
    const [settings, cat] = await Promise.all([
      getProductTypeSettings(),
      searchParams.category
        ? prisma.category.findUnique({
            where: { slug: searchParams.category },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);
    const type = getConfiguredProductType(searchParams.type, settings) ?? findTypeByKeyword(searchParams.type);
    if (type && type.active !== false) {
      const label = cat ? `${type.label} ${cat.name}` : type.label;
      return {
        title: cat
          ? `${label} — купить в Химках с доставкой`
          : type.seoTitle || `${type.label} — купить в Химках с доставкой`,
        description:
          (cat
            ? `${label} от производителя в Химках. Актуальные размеры, цены, наличие и доставка по Москве и Московской области.`
            : type.seoDescription) ||
          `${type.label} от производителя в Химках. Цены, размеры, наличие и доставка по Москве и МО.`,
        alternates: {
          canonical: `https://pilo-rus.ru/catalog?${new URLSearchParams({
            ...(searchParams.category ? { category: searchParams.category } : {}),
            type: searchParams.type,
          }).toString()}`,
        },
        robots,
      };
    }
  }
  if (searchParams.category) {
    const cat = await prisma.category.findUnique({
      where: { slug: searchParams.category },
      select: { name: true, seoTitle: true, seoDescription: true },
    });
    if (cat) {
      return {
        title: cat.seoTitle || `${cat.name} — купить от производителя`,
        description: cat.seoDescription || `Купить ${cat.name} от производителя. Широкий ассортимент, доставка по Москве и МО.`,
        alternates: { canonical: `https://pilo-rus.ru/catalog?category=${searchParams.category}` },
        robots,
      };
    }
  }
  return {
    title: "Каталог пиломатериалов — цены от производителя",
    description: "Доска, брус, вагонка, блок-хаус от производителя в Химках. Цены без посредников, доставка по Москве и МО.",
    alternates: { canonical: "https://pilo-rus.ru/catalog" },
    robots,
  };
}

interface SearchParams {
  category?: string;
  sort?: string;
  view?: string;
  page?: string;
  size?: string;
  type?: string;
  instock?: string;
  minprice?: string;
  maxprice?: string;
  search?: string;
}

type CatalogView = "auto" | "list" | "2" | "3" | "4" | "5";

function getCatalogView(value?: string): CatalogView {
  return value === "list" || value === "2" || value === "3" || value === "4" || value === "5" ? value : "auto";
}

function getCatalogRobots(searchParams: SearchParams): Metadata["robots"] | undefined {
  const hasUtilityFilters = Boolean(
    searchParams.search ||
      searchParams.size ||
      searchParams.instock ||
      searchParams.minprice ||
      searchParams.maxprice ||
      searchParams.sort ||
      (searchParams.view && searchParams.view !== "auto") ||
      (searchParams.page && searchParams.page !== "1"),
  );

  return hasUtilityFilters ? { index: false, follow: true } : undefined;
}

function absoluteSiteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `https://pilo-rus.ru${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function productMinPrice(product: { variants: Array<{ pricePerCube: unknown; pricePerPiece: unknown }> }) {
  const prices = product.variants
    .flatMap((variant) => [variant.pricePerPiece, variant.pricePerCube])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = parseInt(searchParams.page || "1");
  const perPage = 24;
  const currentSize = searchParams.size || "";
  const currentType = searchParams.type || "";
  const currentInStock = searchParams.instock === "1";
  const currentMinPrice = searchParams.minprice ? Number(searchParams.minprice) : null;
  const currentMaxPrice = searchParams.maxprice ? Number(searchParams.maxprice) : null;
  const currentSearch = (searchParams.search || "").trim();
  const catalogView = getCatalogView(searchParams.view);

  // Build variant sub-filter (user-driven: size, instock, price)
  const variantWhere: Prisma.ProductVariantWhereInput = {};
  if (currentSize) variantWhere.size = { contains: currentSize };
  if (currentInStock) variantWhere.inStock = true;
  if (currentMinPrice !== null || currentMaxPrice !== null) {
    const priceBounds = {
      ...(currentMinPrice !== null ? { gte: currentMinPrice } : {}),
      ...(currentMaxPrice !== null ? { lte: currentMaxPrice } : {}),
    };
    variantWhere.OR = [
      { pricePerCube: { not: null, ...priceBounds } },
      { pricePerPiece: { not: null, ...priceBounds } },
    ];
  }

  // Public safety filter — не показываем в каталоге товары без фото/цены/остатка.
  // Админ видит всё в /admin/products с индикаторами, публика — только готовое.
  const publicFilter = getPublicProductsFilter();
  const publicVariantFilter = getPublicVariantsFilter();
  const publicVariantSome = (publicFilter.variants as any)?.some ?? {};

  // Комбинируем публичный variant-фильтр с пользовательским через AND
  const combinedVariantSome = Object.keys(variantWhere).length > 0
    ? { AND: [publicVariantSome, variantWhere] }
    : publicVariantSome;

  let scopedCategorySlugs: string[] | null = null;
  if (searchParams.category) {
    const scopedCategory = await prisma.category.findFirst({
      where: { slug: searchParams.category, showInMenu: true },
      select: {
        slug: true,
        children: {
          where: { showInMenu: true },
          select: { slug: true },
        },
      },
    });
    if (!scopedCategory) redirect("/catalog");
    scopedCategorySlugs = [scopedCategory.slug, ...scopedCategory.children.map((child) => child.slug)];
  }

  // Build where clause (always filter hidden categories + public safety).
  // Parent category pages include direct child categories, so menu hierarchy works as one landing page.
  const categoryFilter: Prisma.CategoryWhereInput = scopedCategorySlugs
    ? { slug: { in: scopedCategorySlugs }, showInMenu: true }
    : { showInMenu: true };

  const searchFilter: Prisma.ProductWhereInput = currentSearch
    ? {
        OR: [
          { name: { contains: currentSearch, mode: "insensitive" } },
          { description: { contains: currentSearch, mode: "insensitive" } },
          { category: { name: { contains: currentSearch, mode: "insensitive" } } },
          { variants: { some: { size: { contains: currentSearch, mode: "insensitive" } } } },
        ],
      }
    : {};

  // Умная фильтрация по типу: regex-based через extractProductType
  // Поддержка групп: type=доска → все подтипы (обрезная, строганная, пола, террасная)
  let typeProductIds: string[] | null = null;
  if (currentType) {
    const allProds = await prisma.product.findMany({
      where: { active: true, category: categoryFilter, images: { isEmpty: false } },
      select: { id: true, name: true },
    });
    const groupKeywords = getTypeGroupKeywords(currentType);
    typeProductIds = allProds
      .filter(p => {
        const pt = extractProductType(p.name);
        if (!pt) return false;
        if (groupKeywords) return groupKeywords.includes(pt.keyword);
        return pt.keyword === currentType;
      })
      .map(p => p.id);
  }

  const where: Prisma.ProductWhereInput = {
    active: true,
    images: { isEmpty: false },
    category: categoryFilter,
    ...searchFilter,
    ...(typeProductIds !== null ? { id: { in: typeProductIds } } : {}),
    variants: { some: combinedVariantSome },
  };

  // Базовый where без фильтра по типу — для подсчёта доступных типов
  // Учитывает выбранный размер и "в наличии", и public safety (без фото/цены — не считаем)
  const sizeVariantFilter: Prisma.ProductVariantWhereInput = {};
  if (currentSize) sizeVariantFilter.size = { contains: currentSize };
  if (currentInStock) sizeVariantFilter.inStock = true;

  const combinedTypesVariantSome = Object.keys(sizeVariantFilter).length > 0
    ? { AND: [publicVariantSome, sizeVariantFilter] }
    : publicVariantSome;

  const whereForTypes: Prisma.ProductWhereInput = {
    active: true,
    images: { isEmpty: false },
    category: categoryFilter,
    ...searchFilter,
    variants: { some: combinedTypesVariantSome },
  };

  const whereForPriceRange: Prisma.ProductWhereInput = {
    active: true,
    images: { isEmpty: false },
    category: categoryFilter,
    ...searchFilter,
    ...(typeProductIds !== null ? { id: { in: typeProductIds } } : {}),
    variants: { some: combinedTypesVariantSome },
  };

  const [settings, productTypeSettings] = await Promise.all([
    getSiteSettings(),
    getProductTypeSettings(),
  ]);
  const phones = getPhones(settings);

  let categories: any[] = [], productsRaw: any[] = [], totalCount = 0, allVariantSizes: any[] = [], productsForTypes: any[] = [];
  let priceRangeResult: {
    _min: { pricePerCube: unknown; pricePerPiece: unknown };
    _max: { pricePerCube: unknown; pricePerPiece: unknown };
  } | null = null;
  try {
    [categories, productsRaw, totalCount, allVariantSizes, productsForTypes, priceRangeResult] = await Promise.all([
      prisma.category.findMany({
        where: { showInMenu: true },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: { where: publicFilter } } } },
      }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: { where: publicVariantFilter, orderBy: { pricePerCube: "asc" } },
        },
        orderBy:
          searchParams.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.product.count({ where }),
      prisma.productVariant.findMany({
        where: {
          product: {
            active: true,
            images: { isEmpty: false },
            category: categoryFilter,
            ...(typeProductIds !== null ? { id: { in: typeProductIds } } : {}),
          },
          inStock: true,
          OR: [
            { pricePerCube: { not: null, gt: 0 } },
            { pricePerPiece: { not: null, gt: 0 } },
          ],
        },
        select: { size: true },
        distinct: ["size"],
      }),
      // Получаем все названия товаров в текущей категории для умных фильтров
      prisma.product.findMany({
        where: whereForTypes,
        select: { name: true },
      }),
      prisma.productVariant.aggregate({
        where: {
          product: whereForPriceRange,
          inStock: true,
          OR: [
            { pricePerCube: { not: null, gt: 0 } },
            { pricePerPiece: { not: null, gt: 0 } },
          ],
        },
        _min: { pricePerCube: true, pricePerPiece: true },
        _max: { pricePerCube: true, pricePerPiece: true },
      }),
    ]);
  } catch (err) {
    console.error("Catalog query error:", err);
    // Продолжаем с пустыми данными — страница покажет "нет товаров" вместо 500
  }

  // Price sort (JS post-fetch since Prisma can't orderBy on has-many aggregate)
  const getMinPrice = (p: typeof productsRaw[0]) =>
    Math.min(...p.variants.map((v: any) => Number(v.pricePerCube ?? v.pricePerPiece ?? 999999)));
  const products = [...productsRaw];
  if (searchParams.sort === "price_asc") {
    products.sort((a, b) => getMinPrice(a) - getMinPrice(b));
  } else if (searchParams.sort === "price_desc") {
    products.sort((a, b) => getMinPrice(b) - getMinPrice(a));
  }

  // Доступные типы — ДИНАМИЧЕСКИ из реальных названий товаров
  const productNames = productsForTypes.map((p) => p.name);
  const dynamicTypes = applyProductTypeSettings(getAvailableTypes(productNames), productTypeSettings);
  const minPriceCandidates = [priceRangeResult?._min.pricePerCube, priceRangeResult?._min.pricePerPiece]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxPriceCandidates = [priceRangeResult?._max.pricePerCube, priceRangeResult?._max.pricePerPiece]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const rawPriceMin = minPriceCandidates.length > 0 ? Math.min(...minPriceCandidates) : 0;
  const rawPriceMax = maxPriceCandidates.length > 0 ? Math.max(...maxPriceCandidates) : 0;
  const priceRange = {
    min: Math.max(0, Math.floor((Number.isFinite(rawPriceMin) ? rawPriceMin : 0) / 500) * 500),
    max: Math.max(0, Math.ceil((Number.isFinite(rawPriceMax) ? rawPriceMax : 0) / 500) * 500),
  };

  // Находим текущий тип по keyword для отображения label
  const currentTypeInfo = currentType
    ? getConfiguredProductType(currentType, productTypeSettings) ?? findTypeByKeyword(currentType)
    : null;

  const currentTypeIsAvailable =
    !currentType ||
    dynamicTypes.some((type) => type.keyword === currentType) ||
    Boolean(getTypeGroupKeywords(currentType)?.some((keyword) => dynamicTypes.some((type) => type.keyword === keyword)));

  if (currentType && !currentTypeIsAvailable) {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.search) params.set("search", searchParams.search);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (catalogView !== "auto") params.set("view", catalogView);
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    if (searchParams.minprice) params.set("minprice", searchParams.minprice);
    if (searchParams.maxprice) params.set("maxprice", searchParams.maxprice);
    const q = params.toString();
    redirect(`/catalog${q ? `?${q}` : ""}`);
  }

  const totalPages = Math.ceil(totalCount / perPage);

  // Полные размеры вариантов (как есть в БД) — для sidebar фильтра
  // Включаем ВСЕ форматы: "25×100×6000" (пиломатериалы), "18 мм (1/1)" (фанера/листовые)
  const fullSizes = Array.from(new Set(allVariantSizes.map(v => v.size)))
    .filter(s => s && s.trim().length > 0)
    .sort((a, b) => {
      const aNums = a.match(/\d+/g)?.map(Number) || [0];
      const bNums = b.match(/\d+/g)?.map(Number) || [0];
      // Сортировка по первому числу, затем по второму (если есть)
      for (let i = 0; i < Math.max(aNums.length, bNums.length); i++) {
        const diff = (aNums[i] || 0) - (bNums[i] || 0);
        if (diff !== 0) return diff;
      }
      return a.localeCompare(b);
    });

  /** Builds URL removing/setting specific filter params while keeping all others */
  const buildFilterUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.search) params.set("search", searchParams.search);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (catalogView !== "auto") params.set("view", catalogView);
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    if (searchParams.minprice) params.set("minprice", searchParams.minprice);
    if (searchParams.maxprice) params.set("maxprice", searchParams.maxprice);
    // Apply updates
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const q = params.toString();
    return `/catalog${q ? `?${q}` : ""}`;
  };

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.search) params.set("search", searchParams.search);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (catalogView !== "auto") params.set("view", catalogView);
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    if (searchParams.minprice) params.set("minprice", searchParams.minprice);
    if (searchParams.maxprice) params.set("maxprice", searchParams.maxprice);
    params.set("page", String(p));
    return `/catalog?${params.toString()}`;
  };

  const buildSortUrl = (sort: string) => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.search) params.set("search", searchParams.search);
    if (catalogView !== "auto") params.set("view", catalogView);
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    if (searchParams.minprice) params.set("minprice", searchParams.minprice);
    if (searchParams.maxprice) params.set("maxprice", searchParams.maxprice);
    if (sort) params.set("sort", sort);
    const q = params.toString();
    return `/catalog${q ? `?${q}` : ""}`;
  };

  const buildViewUrl = (view: CatalogView) => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.search) params.set("search", searchParams.search);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    if (searchParams.minprice) params.set("minprice", searchParams.minprice);
    if (searchParams.maxprice) params.set("maxprice", searchParams.maxprice);
    params.set("view", view);
    const q = params.toString();
    return `/catalog${q ? `?${q}` : ""}`;
  };

  // BreadcrumbList schema
  const currentCat = searchParams.category
    ? categories.find((c) => c.slug === searchParams.category)
    : null;
  const pageTitle = currentTypeInfo
    ? currentCat
      ? `${currentTypeInfo.label} — ${currentCat.name}`
      : currentTypeInfo.label
    : currentCat
      ? currentCat.name
      : "Каталог";
  const pageDescription =
    currentTypeInfo?.description ||
    currentCat?.seoDescription ||
    (currentCat ? "Узнавайте первыми о поступлениях и скидках" : "Все пиломатериалы в наличии");
  const listingTitle = currentSearch
    ? `Поиск: ${currentSearch}`
    : searchParams.category
    ? categories.find((c) => c.slug === searchParams.category)?.name || "Каталог"
    : "Все пиломатериалы";
  const heroDescription =
    currentSearch
      ? `Нашли позиции по запросу «${currentSearch}». Можно уточнить тип, размер, наличие и сразу перейти в карточку товара.`
      : currentTypeInfo?.description ||
        currentCat?.seoDescription ||
        "Доска, брус, вагонка и другие пиломатериалы от производителя в Химках. Смотрите фото, размеры, цены и наличие без лишних шагов.";
  const catalogStats = [
    {
      label: `${totalCount} позиций`,
      sub: currentInStock ? "по текущим фильтрам" : "готовых к заказу",
      Icon: PackageCheck,
      href: currentInStock ? buildFilterUrl({}) : buildFilterUrl({ instock: "1" }),
    },
    {
      label: "Цены из каталога",
      sub: "по размерам и единицам",
      Icon: BadgeCheck,
      href: "/calculator",
    },
    {
      label: "Доставка 1–3 дня",
      sub: "Москва и область",
      Icon: Truck,
      href: "/delivery",
    },
  ];
  const prefetchHrefs = [
    ...categories
      .filter((cat) => cat.slug !== searchParams.category)
      .map((cat) => `/catalog?category=${cat.slug}`),
    ...dynamicTypes
      .filter((type) => type.keyword !== currentType)
      .slice(0, 6)
      .map((type) => buildFilterUrl({ type: type.keyword })),
    page < totalPages ? buildPageUrl(page + 1) : null,
  ];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://pilo-rus.ru/" },
      ...(currentCat
        ? [
            { "@type": "ListItem", "position": 2, "name": "Каталог", "item": "https://pilo-rus.ru/catalog" },
            { "@type": "ListItem", "position": 3, "name": currentCat.name },
          ]
        : [{ "@type": "ListItem", "position": 2, "name": "Каталог" }]),
    ],
  };
  const catalogItemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": pageTitle,
    "description": pageDescription,
    "numberOfItems": totalCount,
    "itemListElement": products.map((product, index) => {
      const minPrice = productMinPrice(product);
      const availability = getProductAvailability(product.variants);
      return {
        "@type": "ListItem",
        "position": (page - 1) * perPage + index + 1,
        "url": `https://pilo-rus.ru/product/${product.slug}`,
        "item": {
          "@type": "Product",
          "name": product.name,
          "image": product.images?.[0] ? absoluteSiteUrl(product.images[0]) : undefined,
          "category": product.category.name,
          "offers": minPrice
            ? {
                "@type": "AggregateOffer",
                "priceCurrency": "RUB",
                "lowPrice": minPrice,
                "offerCount": product.variants.length,
                "availability": availability.schemaAvailability,
              }
            : undefined,
        },
      };
    }),
  };

  const sortOptions = [
    { value: "", label: "Новые" },
    { value: "name", label: "А–Я" },
    { value: "price_asc", label: "Цена ↑" },
    { value: "price_desc", label: "Цена ↓" },
  ];
  const currentSortLabel = sortOptions.find((option) => option.value === (searchParams.sort || ""))?.label || "Новые";
  const viewOptions: Array<{ value: CatalogView; label: string; title: string; Icon: typeof LayoutGrid }> = [
    { value: "auto", label: "Авто", title: "Автоматически по ширине экрана", Icon: Monitor },
    { value: "list", label: "Прайс", title: "Список как прайс", Icon: LayoutList },
    { value: "2", label: "2", title: "Две карточки в ряд", Icon: Columns2 },
    { value: "3", label: "3", title: "Три карточки в ряд", Icon: Grid3x3 },
    { value: "4", label: "4", title: "Четыре карточки в ряд", Icon: LayoutGrid },
    { value: "5", label: "5", title: "Пять карточек в ряд", Icon: LayoutGrid },
  ];
  const productGridClass =
    catalogView === "list"
      ? "grid grid-cols-1 gap-3"
    : catalogView === "2"
      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-2"
    : catalogView === "3"
      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
    : catalogView === "5"
      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5"
      : "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4";

  return (
    <div className="container max-w-[100vw] overflow-x-clip py-3 sm:py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogItemListSchema) }}
      />
      <RoutePrefetcher hrefs={prefetchHrefs} />
      <CatalogViewMemory currentView={catalogView} hasViewParam={Boolean(searchParams.view)} />

      {/* ── Заголовок ── */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-3 shadow-[0_18px_45px_-38px_hsl(var(--foreground)/0.45)] sm:mb-5 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/28 bg-primary/10 text-primary sm:inline-flex">
              <PackageCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <BadgeCheck className="h-3.5 w-3.5" />
                Каталог ПилоРус
              </p>
              <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                {pageTitle}
              </h1>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {totalCount} позиций в подборке
              </p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-wrap gap-1.5 text-[10px] font-semibold text-muted-foreground sm:flex sm:w-[360px] sm:justify-end">
            <span className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/55 px-2.5 py-2 text-center sm:flex-none">В наличии</span>
            <span className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/55 px-2.5 py-2 text-center sm:flex-none">Доставка 1-3 дня</span>
            <span className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/55 px-2.5 py-2 text-center sm:flex-none">Расчет м³</span>
          </div>
        </div>

        <Link
          href="/calculator"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/28 bg-primary/10 px-3 py-2.5 transition-colors hover:bg-primary/15 sm:px-4"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Calculator className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Не знаете, сколько нужно?</p>
            <p className="hidden text-xs text-muted-foreground xs:block">Калькулятор рассчитает м³, штуки и стоимость</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
        </Link>
      </div>

      {/* ── Sticky фильтр-полоса ── */}
      <CatalogTypeFilter
        currentType={currentType}
        category={searchParams.category}
        types={dynamicTypes}
        preserveParams={{
          ...(searchParams.sort ? { sort: searchParams.sort } : {}),
          ...(catalogView !== "auto" ? { view: catalogView } : {}),
          ...(searchParams.search ? { search: searchParams.search } : {}),
          ...(searchParams.size ? { size: searchParams.size } : {}),
          ...(searchParams.instock ? { instock: searchParams.instock } : {}),
          ...(searchParams.minprice ? { minprice: searchParams.minprice } : {}),
          ...(searchParams.maxprice ? { maxprice: searchParams.maxprice } : {}),
        }}
      />

      {/* ── Мобильная строка фильтров (только на мобильном) ── */}
      <div className="flex lg:hidden items-center gap-2 mb-4 pb-1 scrollbar-hide" style={{ overflowX: "auto", overflowY: "visible" }}>
        <CatalogMobileFilter
          categories={categories}
          sizes={fullSizes}
          types={dynamicTypes}
          currentCategory={searchParams.category}
          currentSize={currentSize}
          currentType={currentType}
          currentInStock={searchParams.instock === "1"}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
          priceRange={priceRange}
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-6 xl:gap-8">
        {/* Sidebar */}
        <aside className="hidden shrink-0 lg:block lg:w-[17rem] xl:w-[18rem] 2xl:w-[19rem]">
          <div className="catalog-filter-scroll sticky top-24 space-y-4 pr-1">
            {/* Categories */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none">
                  <path d="M3 5h18M3 12h18M3 19h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Категории
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link
                    prefetch
                    href="/catalog"
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      !searchParams.category
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Все категории
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      prefetch
                      href={`/catalog?category=${cat.slug}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        searchParams.category === cat.slug
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{cat.name}</span>
                      {(cat as any)._count?.products > 0 && (
                        <span className="text-xs text-muted-foreground/70">{(cat as any)._count.products}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Filters client component */}
            <Suspense
              fallback={
                <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              }
            >
              <CatalogFilters
                currentInStock={currentInStock}
                currentSize={currentSize}
                sizes={fullSizes}
                currentType={currentType}
                types={dynamicTypes}
                currentMinPrice={currentMinPrice}
                currentMaxPrice={currentMaxPrice}
                priceRange={priceRange}
              />
            </Suspense>

            {/* Contact block */}
            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 text-center">
              <p className="text-sm font-medium mb-2">Нужна помощь с выбором?</p>
              <p className="text-xs text-muted-foreground mb-3">
                Наши менеджеры помогут подобрать нужный материал
              </p>
              <PhoneLinks phones={phones} variant="sidebar" />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-3 flex w-[calc(100vw-2rem)] max-w-full items-start justify-between gap-3 sm:mb-5 sm:w-full sm:items-center sm:gap-4">
            <h2 className="font-display text-xl font-bold leading-tight sm:text-2xl">
              {listingTitle}
            </h2>

            <div className="flex shrink-0 items-center gap-2 sm:w-auto">
              <div className="hidden lg:block">
                <InstockToggle active={searchParams.instock === "1"} />
              </div>
              <details className="relative sm:hidden">
                <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  {currentSortLabel}
                </summary>
                <div className="absolute right-0 top-[calc(100%+0.45rem)] z-30 w-44 overflow-hidden rounded-2xl border border-border bg-card/95 p-1.5 shadow-2xl ring-1 ring-primary/10 backdrop-blur-xl">
                  {sortOptions.map((opt) => (
                    <Link
                      key={opt.value}
                      href={buildSortUrl(opt.value)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                        (searchParams.sort || "") === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              </details>
              <div className="hidden items-center gap-1 rounded-xl border border-border/70 bg-card/70 p-1 shadow-sm xl:flex" aria-label="Вид каталога">
                {viewOptions.map(({ value, label, title, Icon }) => (
                  <Link
                    key={value}
                    href={buildViewUrl(value)}
                    title={title}
                    className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors ${
                      catalogView === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="mr-1 text-sm text-muted-foreground">Сортировка:</span>
                {sortOptions.map((opt) => (
                  <Link
                    key={opt.value}
                    href={buildSortUrl(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      (searchParams.sort || "") === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Active filters */}
          {(currentSearch || currentSize || currentType || currentMinPrice !== null || currentMaxPrice !== null) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentSearch && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  Поиск: {currentSearch}
                  <Link
                    href={buildFilterUrl({ search: null })}
                    className="ml-0.5 hover:text-destructive"
                  >
                    ×
                  </Link>
                </span>
              )}
              {currentType && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  Тип: {currentTypeInfo?.label || currentType}
                  <Link
                    href={buildFilterUrl({ type: null })}
                    className="ml-0.5 hover:text-destructive"
                  >
                    ×
                  </Link>
                </span>
              )}
              {currentSize && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  Размер: {currentSize}
                  <Link
                    href={buildFilterUrl({ size: null })}
                    className="ml-0.5 hover:text-destructive"
                  >
                    ×
                  </Link>
                </span>
              )}
              {(currentMinPrice !== null || currentMaxPrice !== null) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  Цена: {currentMinPrice !== null ? `от ${currentMinPrice.toLocaleString("ru-RU")}` : "от минимума"}
                  {" "}
                  {currentMaxPrice !== null ? `до ${currentMaxPrice.toLocaleString("ru-RU")}` : "до максимума"}
                  <Link
                    href={buildFilterUrl({ minprice: null, maxprice: null })}
                    className="ml-0.5 hover:text-destructive"
                  >
                    ×
                  </Link>
                </span>
              )}
            </div>
          )}

          {/* Products grid */}
          {products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <SearchX className="w-16 h-16 mx-auto mb-4 opacity-40" strokeWidth={1.5} />
              <p className="text-lg font-medium">Товары не найдены</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                {searchParams.search
                  ? `По запросу «${searchParams.search}» ничего не нашлось`
                  : currentType && currentSize
                  ? `Нет товаров типа «${currentType}» с размером «${currentSize}»`
                  : currentType
                  ? `Нет товаров типа «${currentType}» в этой категории`
                  : currentSize
                  ? `Нет товаров с размером «${currentSize}»`
                  : currentInStock
                  ? "Нет товаров в наличии по текущим фильтрам"
                  : "Попробуйте изменить фильтры или выбрать другую категорию"}
              </p>
              <Link href="/catalog" className="inline-block mt-4 text-primary hover:underline text-sm">
                Сбросить все фильтры
              </Link>
            </div>
          ) : (
            <div className={productGridClass}>
              {products.map((product) => (
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
                  viewMode={catalogView === "list" ? "list" : "grid"}
                  variants={product.variants.map((v: any) => ({
                    id: v.id,
                    size: v.size,
                    pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
                    pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
                    piecesPerCube: v.piecesPerCube,
                    inStock: v.inStock,
                    stockQty: v.stockQty,
                    lowStockThreshold: v.lowStockThreshold,
                  }))}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {page > 1 && (
                <Link prefetch href={buildPageUrl(page - 1)} className="px-4 h-11 rounded-xl flex items-center justify-center text-sm font-medium border border-border hover:bg-accent transition-colors">←</Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                <Link
                  prefetch
                  key={i + 1}
                  href={buildPageUrl(i + 1)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                    page === i + 1 ? "border border-primary/35 bg-primary/10 text-primary" : "border border-border hover:bg-accent"
                  }`}
                >
                  {i + 1}
                </Link>
              ))}
              {page < totalPages && (
                <Link prefetch href={buildPageUrl(page + 1)} className="px-4 h-11 rounded-xl flex items-center justify-center text-sm font-medium border border-border hover:bg-accent transition-colors">→</Link>
              )}
            </div>
          )}

          <section className="mt-10 border-t border-border pt-6">
            <div>
              <h2 className="font-display text-xl font-bold">{pageTitle}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                {heroDescription}
              </p>
              {pageDescription !== heroDescription && (
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                  {pageDescription}
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {catalogStats.map(({ label, sub, Icon, href }) => (
                <Link
                  prefetch
                  key={label}
                  href={href}
                  className="group flex min-h-[82px] items-center gap-3 rounded-xl border border-border bg-card/70 px-3.5 py-3 transition hover:border-primary/45 hover:bg-card"
                >
                  <div className="store-icon-tile h-9 w-9 shrink-0 rounded-xl">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight text-foreground">{label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{sub}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
