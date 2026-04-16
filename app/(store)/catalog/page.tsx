export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/product-card";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { CatalogTypeFilter } from "@/components/store/catalog-type-filter";
import { CatalogMobileFilter } from "@/components/store/catalog-mobile-filter";
import { InstockToggle } from "@/components/store/instock-toggle";
import { Calculator, ArrowRight, Phone } from "lucide-react";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  if (searchParams.category) {
    const cat = await prisma.category.findUnique({
      where: { slug: searchParams.category },
      select: { name: true, seoTitle: true, seoDescription: true },
    });
    if (cat) {
      return {
        title: cat.seoTitle || `${cat.name} — пиломатериалы ПилоРус`,
        description: cat.seoDescription || `Купить ${cat.name} от производителя. Широкий ассортимент, доставка по Москве и МО.`,
      };
    }
  }
  return {
    title: "Каталог пиломатериалов",
    description: "Широкий выбор пиломатериалов: доска, брус, вагонка, блок-хаус. Цены от производителя.",
  };
}

interface SearchParams {
  category?: string;
  sort?: string;
  page?: string;
  size?: string;
  type?: string;
  instock?: string;
  minprice?: string;
  maxprice?: string;
}

/** Извлекает сечение из строки размера "25×100×6000" → "25×100" */
function extractCrossSection(size: string): string | null {
  const match = size.match(/^(\d+[×x]\d+)[×x]/);
  return match ? match[1].replace("x", "×") : null;
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

  // Build variant sub-filter
  const variantWhere: Record<string, unknown> = {};
  if (currentSize) variantWhere.size = { contains: currentSize };
  if (currentInStock) variantWhere.inStock = true;
  if (currentMinPrice !== null || currentMaxPrice !== null) {
    variantWhere.pricePerCube = {
      ...(currentMinPrice !== null ? { gte: currentMinPrice } : {}),
      ...(currentMaxPrice !== null ? { lte: currentMaxPrice } : {}),
    };
  }

  // Build where clause (always filter hidden categories)
  const categoryFilter = searchParams.category
    ? { slug: searchParams.category, showInMenu: true }
    : { showInMenu: true };

  const where = {
    active: true,
    category: categoryFilter,
    ...(currentType ? { name: { contains: currentType, mode: "insensitive" as const } } : {}),
    ...(Object.keys(variantWhere).length > 0 ? { variants: { some: variantWhere } } : {}),
  };

  // Базовый where без фильтра по типу — для подсчёта доступных типов
  const whereForTypes = {
    active: true,
    category: searchParams.category
      ? { slug: searchParams.category, showInMenu: true }
      : { showInMenu: true },
  };

  const [categories, productsRaw, totalCount, allVariantSizes, productsForTypes] = await Promise.all([
    prisma.category.findMany({
      where: { showInMenu: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: { orderBy: { pricePerCube: "asc" } },
      },
      orderBy:
        searchParams.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
    prisma.productVariant.findMany({
      where: { product: { active: true, category: categoryFilter } },
      select: { size: true },
      distinct: ["size"],
    }),
    // Получаем все названия товаров в текущей категории для умных фильтров
    prisma.product.findMany({
      where: whereForTypes,
      select: { name: true },
    }),
  ]);

  // Если запрошена скрытая или несуществующая категория — редирект в каталог
  if (searchParams.category && !categories.find((c) => c.slug === searchParams.category)) {
    redirect("/catalog");
  }

  // Price sort (JS post-fetch since Prisma can't orderBy on has-many aggregate)
  const getMinPrice = (p: typeof productsRaw[0]) =>
    Math.min(...p.variants.map((v) => Number(v.pricePerCube ?? v.pricePerPiece ?? 999999)));
  const products = [...productsRaw];
  if (searchParams.sort === "price_asc") {
    products.sort((a, b) => getMinPrice(a) - getMinPrice(b));
  } else if (searchParams.sort === "price_desc") {
    products.sort((a, b) => getMinPrice(b) - getMinPrice(a));
  }

  // Доступные типы — только те, для которых есть товары в категории
  const productNamesLower = productsForTypes.map((p) => p.name.toLowerCase());

  // Для ГОРИЗОНТАЛЬНОЙ полосы — грубые типы (одна кнопка = весь класс)
  const coarseTypeValues = ["доска", "брус", "вагонка", "планкен", "блок-хаус", "плинтус", "строганная", "фанера", "дсп"];
  const availableCoarseTypes = coarseTypeValues.filter((tv) =>
    productNamesLower.some((name) => name.includes(tv))
  );

  // Для БОКОВОГО фильтра — точные подтипы (точное совпадение ключевого слова)
  const preciseTypeValues = ["обрезная", "террасная", "пола", "строганная", "брус", "вагонка", "планкен", "блок-хаус", "плинтус", "фанера", "дсп"];
  const availableTypes = preciseTypeValues.filter((tv) =>
    productNamesLower.some((name) => name.includes(tv))
  );

  const totalPages = Math.ceil(totalCount / perPage);

  // Extract unique cross-sections
  const crossSections = Array.from(
    new Set(
      allVariantSizes
        .map((v) => extractCrossSection(v.size))
        .filter((s): s is string => s !== null)
    )
  ).sort((a, b) => parseInt(a.split("×")[0]) - parseInt(b.split("×")[0]));

  /** Builds URL removing/setting specific filter params while keeping all others */
  const buildFilterUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.sort) params.set("sort", searchParams.sort);
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
    if (searchParams.sort) params.set("sort", searchParams.sort);
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
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    if (searchParams.minprice) params.set("minprice", searchParams.minprice);
    if (searchParams.maxprice) params.set("maxprice", searchParams.maxprice);
    if (sort) params.set("sort", sort);
    return `/catalog?${params.toString()}`;
  };

  return (
    <div className="container py-6">

      {/* ── Заголовок ── */}
      <div className="mb-3">
        <h1 className="font-display font-bold text-2xl sm:text-3xl">
          {searchParams.category
            ? categories.find((c) => c.slug === searchParams.category)?.name ?? "Каталог"
            : "Каталог"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {searchParams.category ? "Показаны товары категории" : "Все пиломатериалы в наличии"}
        </p>
      </div>

      {/* ── Баннер-калькулятор ── */}
      <Link href="/calculator" className="flex items-center gap-3 px-4 py-3 mb-4 bg-primary/5 border border-primary/20 rounded-2xl hover:bg-primary/10 transition-colors">
        <Calculator className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Не знаете сколько нужно?</p>
          <p className="text-xs text-muted-foreground">Калькулятор рассчитает м³ и стоимость за 30 секунд</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </Link>

      {/* ── Sticky фильтр-полоса ── */}
      <CatalogTypeFilter
        currentType={currentType}
        category={searchParams.category}
        availableTypes={availableCoarseTypes}
        preserveParams={{
          ...(searchParams.sort ? { sort: searchParams.sort } : {}),
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
          sizes={crossSections}
          availableTypes={availableTypes}
          currentCategory={searchParams.category}
          currentSize={currentSize}
          currentType={currentType}
          currentInStock={searchParams.instock === "1"}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block lg:w-64 shrink-0">
          <div className="sticky top-24 space-y-4">
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
                sizes={crossSections}
                currentType={currentType}
                availableTypes={availableTypes}
              />
            </Suspense>

            {/* Contact block */}
            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 text-center">
              <p className="text-sm font-medium mb-2">Нужна помощь с выбором?</p>
              <p className="text-xs text-muted-foreground mb-3">
                Наши менеджеры помогут подобрать нужный материал
              </p>
              <a
                href="tel:+79859707133"
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
              >
                <Phone className="w-4 h-4 shrink-0" />
                8-985-970-71-33
              </a>
              <a
                href="tel:+79996622602"
                className="block mt-1.5 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                8-999-662-26-02
              </a>
              <a
                href="tel:+79776068020"
                className="block mt-1.5 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                8-977-606-80-20
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 gap-4">
            <h2 className="font-display font-bold text-2xl">
              {searchParams.category
                ? categories.find((c) => c.slug === searchParams.category)?.name || "Каталог"
                : "Все пиломатериалы"}
            </h2>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden lg:block">
                <InstockToggle active={searchParams.instock === "1"} />
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block mr-1">Сортировка:</span>
              {[
                { value: "", label: "Новые" },
                { value: "name", label: "А–Я" },
                { value: "price_asc", label: "Цена ↑", mobileHide: true },
                { value: "price_desc", label: "Цена ↓", mobileHide: true },
              ].map((opt) => (
                <Link
                  key={opt.value}
                  href={buildSortUrl(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    (opt as any).mobileHide ? "hidden sm:block" : ""
                  } ${
                    (searchParams.sort || "") === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Active filters */}
          {(currentSize || currentType) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentType && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  Тип: {currentType}
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
                  Сечение: {currentSize}
                  <Link
                    href={buildFilterUrl({ size: null })}
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
              <div className="text-5xl mb-4">🪵</div>
              <p className="text-lg font-medium">Товары не найдены</p>
              <p className="text-sm mt-2">Попробуйте изменить фильтры</p>
              <Link href="/catalog" className="inline-block mt-4 text-primary hover:underline text-sm">
                Сбросить все фильтры
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
              {products.map((product) => (
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {page > 1 && (
                <Link href={buildPageUrl(page - 1)} className="px-4 h-10 rounded-lg flex items-center justify-center text-sm font-medium border border-border hover:bg-accent transition-colors">←</Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                <Link
                  key={i + 1}
                  href={buildPageUrl(i + 1)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    page === i + 1 ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
                  }`}
                >
                  {i + 1}
                </Link>
              ))}
              {page < totalPages && (
                <Link href={buildPageUrl(page + 1)} className="px-4 h-10 rounded-lg flex items-center justify-center text-sm font-medium border border-border hover:bg-accent transition-colors">→</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
