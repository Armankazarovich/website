export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/product-card";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { BreadcrumbScroll } from "@/components/store/breadcrumb-scroll";

export const metadata: Metadata = {
  title: "Каталог пиломатериалов",
  description: "Широкий выбор пиломатериалов: доска, брус, вагонка, блок-хаус. Цены от производителя.",
};

interface SearchParams {
  category?: string;
  sort?: string;
  page?: string;
  size?: string;
  type?: string;
  instock?: string;
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

  // Build variant sub-filter (size + instock can combine)
  const variantWhere: Record<string, unknown> = {};
  if (currentSize) variantWhere.size = { contains: currentSize };
  if (currentInStock) variantWhere.inStock = true;

  // Build where clause
  const where = {
    active: true,
    ...(searchParams.category ? { category: { slug: searchParams.category } } : {}),
    ...(currentType ? { name: { contains: currentType, mode: "insensitive" as const } } : {}),
    ...(Object.keys(variantWhere).length > 0 ? { variants: { some: variantWhere } } : {}),
  };

  // Базовый where без фильтра по типу — для подсчёта доступных типов
  const whereForTypes = {
    active: true,
    ...(searchParams.category ? { category: { slug: searchParams.category } } : {}),
  };

  const [categories, products, totalCount, allVariantSizes, productsForTypes] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
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
      where: searchParams.category
        ? { product: { active: true, category: { slug: searchParams.category } } }
        : { product: { active: true } },
      select: { size: true },
      distinct: ["size"],
    }),
    // Получаем все названия товаров в текущей категории для умных фильтров
    prisma.product.findMany({
      where: whereForTypes,
      select: { name: true },
    }),
  ]);

  // Доступные типы — только те, для которых есть товары в категории
  const productNamesLower = productsForTypes.map((p) => p.name.toLowerCase());
  const availableTypeValues = new Set(productNamesLower);

  // Список type-значений для боковых фильтров (передаём в CatalogFilters)
  const allTypeValues = ["доска", "брус", "вагонка", "планкен", "блок-хаус", "плинтус", "строганная", "фанера", "дсп"];
  const availableTypes = allTypeValues.filter((tv) =>
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

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    params.set("page", String(p));
    return `/catalog?${params.toString()}`;
  };

  const buildSortUrl = (sort: string) => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.size) params.set("size", searchParams.size);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.instock) params.set("instock", searchParams.instock);
    if (sort) params.set("sort", sort);
    return `/catalog?${params.toString()}`;
  };

  const typeFilters = [
    { label: "Все", type: "" },
    { label: "Доска", type: "доска", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="2" y="14" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg> },
    { label: "Брус", type: "брус", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M6 6v12M18 6v12" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5"/></svg> },
    { label: "Вагонка", type: "вагонка", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M2 7h20M2 12h20M2 17h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: "Блок-хаус", type: "блок-хаус", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M2 8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8z" stroke="currentColor" strokeWidth="1.7"/><path d="M2 15c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-2z" stroke="currentColor" strokeWidth="1.7"/></svg> },
    { label: "Планкен", type: "планкен", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M2 9h20M2 15h20" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.5"/></svg> },
    { label: "Фанера", type: "фанера", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="10" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/></svg> },
    { label: "Строганная", type: "строганная", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  ];

  return (
    <div className="container py-8">

      {/* Breadcrumb */}
      <BreadcrumbScroll
        items={[
          { label: "Главная", href: "/" },
          ...(searchParams.category
            ? [
                { label: "Каталог", href: "/catalog" },
                { label: categories.find((c) => c.slug === searchParams.category)?.name ?? "Категория" },
              ]
            : [{ label: "Каталог" }]
          ),
        ]}
      />

      {/* ── Горизонтальная фильтр-полоса ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display font-bold text-2xl sm:text-3xl">Каталог</h1>
          <span className="text-sm text-muted-foreground">{totalCount} товаров</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {typeFilters
            .filter((f) => {
              // "Все" — всегда показываем
              if (!f.type) return true;
              // Показываем только если есть хотя бы 1 товар с таким типом
              return Array.from(availableTypeValues).some((name) =>
                name.includes(f.type)
              );
            })
            .map((f) => {
              const isActive = currentType === f.type;
              return (
                <Link
                  key={f.type}
                  href={`/catalog?${new URLSearchParams({
                    ...(f.type ? { type: f.type } : {}),
                    ...(searchParams.category ? { category: searchParams.category } : {}),
                  }).toString()}`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {f.icon && <span className={isActive ? "text-primary-foreground" : "text-muted-foreground"}>{f.icon}</span>}
                  {f.label}
                </Link>
              );
            })}
        </div>
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
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        searchParams.category === cat.slug
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.name}
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
                className="block bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                📞 8-985-970-71-33
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 gap-4">
            <h1 className="font-display font-bold text-2xl">
              {searchParams.category
                ? categories.find((c) => c.slug === searchParams.category)?.name || "Каталог"
                : "Все пиломатериалы"}
            </h1>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm text-muted-foreground hidden sm:block mr-1">Сортировка:</span>
              {[
                { value: "", label: "Новые" },
                { value: "name", label: "А–Я" },
              ].map((opt) => (
                <Link
                  key={opt.value}
                  href={buildSortUrl(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                    href={buildSortUrl(searchParams.sort || "").replace(`type=${encodeURIComponent(currentType)}&`, "").replace(`&type=${encodeURIComponent(currentType)}`, "").replace(`type=${encodeURIComponent(currentType)}`, "")}
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
                    href={buildSortUrl(searchParams.sort || "").replace(`size=${encodeURIComponent(currentSize)}&`, "").replace(`&size=${encodeURIComponent(currentSize)}`, "").replace(`size=${encodeURIComponent(currentSize)}`, "")}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
