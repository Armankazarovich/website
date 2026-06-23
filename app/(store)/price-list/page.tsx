import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Download,
  FileText,
  Phone,
  Search,
  ShoppingCart,
} from "lucide-react";
import { PriceListQuickAdd } from "@/components/store/price-list-quick-add";
import {
  PRICE_LIST_UNITS,
  getPriceListData,
  type PriceListFilters,
  type PriceListUnitPrice,
  type PriceListUnit,
} from "@/lib/price-list-data";
import { cn, formatPrice } from "@/lib/utils";

export const revalidate = 300;

type PageProps = {
  searchParams: {
    category?: string;
    q?: string;
    unit?: string;
  };
};

export const metadata: Metadata = {
  title: "Прайс-лист пиломатериалов — актуальные цены ПилоРус",
  description:
    "Актуальный прайс-лист ПилоРус: пиломатериалы, размеры, сорта, цены за м³, м² и штуку. Быстрое добавление в корзину и PDF для сметы.",
  alternates: { canonical: "https://pilo-rus.ru/price-list" },
  openGraph: {
    title: "Прайс-лист ПилоРус",
    description: "Живые цены каталога, быстрый набор заказа и PDF для закупки.",
    url: "https://pilo-rus.ru/price-list",
    type: "website",
  },
};

function normalizeUnit(value: string | undefined): PriceListUnit | "ALL" {
  return value === "CUBE" || value === "SQUARE" || value === "PIECE" ? value : "ALL";
}

function buildHref(filters: Partial<PriceListFilters>) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.unit && filters.unit !== "ALL") params.set("unit", filters.unit);
  const query = params.toString();
  return `/price-list${query ? `?${query}` : ""}`;
}

function pdfHref(filters: Required<PriceListFilters>) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.unit !== "ALL") params.set("unit", filters.unit);
  const query = params.toString();
  return `/api/price-list/pdf${query ? `?${query}` : ""}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function unitPrice(rowUnit: PriceListUnitPrice) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-xl border border-border/70 bg-background/72 px-2.5 py-1.5 text-xs font-bold text-foreground">
      {formatPrice(rowUnit.price)}
      <small className="text-[10px] font-semibold text-muted-foreground">/{rowUnit.label}</small>
    </span>
  );
}

export default async function PriceListPage({ searchParams }: PageProps) {
  const filters: PriceListFilters = {
    category: searchParams.category,
    q: searchParams.q,
    unit: normalizeUnit(searchParams.unit),
  };
  const data = await getPriceListData(filters);
  const activeCategory = data.categories.find((category) => category.slug === data.filters.category);
  const currentPdfHref = pdfHref(data.filters);

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Прайс-лист ПилоРус",
    url: "https://pilo-rus.ru/price-list",
    description: "Актуальные цены на пиломатериалы ПилоРус с быстрым добавлением в корзину.",
    isPartOf: { "@type": "WebSite", name: "ПилоРус", url: "https://pilo-rus.ru" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main data-price-list-page className="min-h-screen bg-background">
        <section className="border-b border-border/70 bg-gradient-to-b from-primary/8 via-background to-background">
          <div className="container py-8 sm:py-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div className="max-w-4xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  <FileText className="h-3.5 w-3.5" />
                  Живой прайс-лист
                </div>
                <h1 className="font-display text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl">
                  Прайс-лист ПилоРус
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Быстрый закупочный список для прорабов, оптовиков и постоянных клиентов: размеры, сорта, единицы цены и добавление в корзину прямо из строки.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    {data.totalProducts} товаров
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    {data.totalRows} позиций
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Обновлено {formatDateTime(data.latestUpdatedAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/25 bg-card/80 p-4 shadow-sm">
                <p className="text-sm font-bold text-foreground">Смета или закупка за минуту</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Откройте нужную категорию, нажимайте плюсы, потом оформляйте заказ или скачивайте актуальный PDF.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <a
                    href={currentPdfHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4" />
                    Скачать PDF
                  </a>
                  <a
                    href="tel:+74951352026"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-bold text-foreground transition-colors hover:bg-accent"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                    Позвонить
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-6">
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <form action="/price-list" className="rounded-2xl border border-border bg-card p-3">
                <input type="hidden" name="category" value={data.filters.category} />
                {data.filters.unit !== "ALL" && <input type="hidden" name="unit" value={data.filters.unit} />}
                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Search className="h-4 w-4 text-primary" />
                  Найти позицию
                </label>
                <div className="flex gap-2">
                  <input
                    name="q"
                    defaultValue={data.filters.q}
                    placeholder="50x150, сорт AB, фанера..."
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                  <button className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                    Найти
                  </button>
                </div>
              </form>

              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="mb-2 text-sm font-bold text-foreground">Категории</p>
                <div className="space-y-1">
                  <Link
                    href={buildHref({ q: data.filters.q, unit: data.filters.unit })}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
                      !data.filters.category ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    Все
                    <span className="text-xs opacity-75">{data.rows.length}</span>
                  </Link>
                  {data.categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={buildHref({ category: category.slug, q: data.filters.q, unit: data.filters.unit })}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                        data.filters.category === category.slug ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                      )}
                    >
                      <span className="min-w-0 truncate">{category.name}</span>
                      <span className="text-xs opacity-75">{category.productCount}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="mb-2 text-sm font-bold text-foreground">Единица цены</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={buildHref({ category: data.filters.category, q: data.filters.q })}
                    className={cn(
                      "rounded-xl border border-border px-3 py-2 text-center text-sm font-bold transition-colors",
                      data.filters.unit === "ALL" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    Все
                  </Link>
                  {(Object.keys(PRICE_LIST_UNITS) as PriceListUnit[]).map((unit) => (
                    <Link
                      key={unit}
                      href={buildHref({ category: data.filters.category, q: data.filters.q, unit })}
                      className={cn(
                        "rounded-xl border border-border px-3 py-2 text-center text-sm font-bold transition-colors",
                        data.filters.unit === unit ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                      )}
                    >
                      {PRICE_LIST_UNITS[unit].label}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                    {activeCategory ? activeCategory.name : "Все категории"}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-black text-foreground">
                    {data.filters.q ? `Поиск: ${data.filters.q}` : "Актуальные позиции"}
                  </h2>
                </div>
                <Link
                  href="/catalog"
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80"
                >
                  Открыть каталог
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {data.rows.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <p className="text-lg font-bold text-foreground">Позиции не найдены</p>
                  <p className="mt-2 text-sm text-muted-foreground">Попробуйте убрать фильтр или написать размер короче.</p>
                  <Link href="/price-list" className="mt-4 inline-flex text-sm font-bold text-primary hover:underline">
                    Сбросить фильтры
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {data.groupedRows.map((group) => (
                    <section key={group.category.slug} className="scroll-mt-24">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-display text-xl font-black text-foreground">{group.category.name}</h3>
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground">
                          {group.rows.length} поз.
                        </span>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-border bg-card">
                        {group.rows.map((row, index) => (
                          <div
                            key={row.key}
                            className={cn(
                              "grid gap-3 border-border p-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-4 lg:grid-cols-[minmax(0,1fr)_280px_220px]",
                              index > 0 && "border-t",
                            )}
                          >
                            <div className="flex min-w-0 gap-3">
                              <Link
                                href={`/product/${row.productSlug}`}
                                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-background sm:h-20 sm:w-20"
                              >
                                {row.productImage ? (
                                  <Image
                                    src={row.productImage}
                                    alt={`${row.productName} ${row.displaySize}`}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-muted" />
                                )}
                              </Link>
                              <div className="min-w-0">
                                <Link
                                  href={`/product/${row.productSlug}`}
                                  className="line-clamp-2 text-base font-black leading-snug text-foreground hover:text-primary"
                                >
                                  {row.productName}
                                </Link>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                                    {row.displaySize}
                                  </span>
                                  {row.grade && (
                                    <span className="rounded-full border border-border px-2.5 py-1 font-bold text-muted-foreground">
                                      {row.grade}
                                    </span>
                                  )}
                                  {row.piecesPerCube && (
                                    <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                                      ≈ {row.piecesPerCube} шт/м³
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap content-start gap-2 lg:justify-end">
                              {row.availableUnits.map((entry) => (
                                <span key={entry.unit}>{unitPrice(entry)}</span>
                              ))}
                            </div>

                            <PriceListQuickAdd
                              productId={row.productId}
                              productSlug={row.productSlug}
                              productName={row.productName}
                              productImage={row.productImage}
                              variantId={row.variantId}
                              variantSize={row.variantSize}
                              preferredUnit={row.preferredUnit}
                              availableUnits={row.availableUnits}
                              stockQty={row.stockQty}
                              piecesPerCube={row.piecesPerCube}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
