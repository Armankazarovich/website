import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  FileText,
  Phone,
  ShoppingCart,
} from "lucide-react";
import { PriceListPdfDownload } from "@/components/store/price-list-pdf-download";
import { PriceListRowActions } from "@/components/store/price-list-row-actions";
import { PriceListSearchAction } from "@/components/store/price-list-search-action";
import {
  PRICE_LIST_UNITS,
  getPriceListData,
  type PriceListFilters,
  type PriceListUnit,
} from "@/lib/price-list-data";
import { cn } from "@/lib/utils";

export const revalidate = 300;

type PageProps = {
  searchParams: {
    category?: string;
    q?: string;
    unit?: string;
    page?: string;
  };
};

const PRICE_LIST_OVERVIEW_ROWS_PER_GROUP = 4;
const PRICE_LIST_PAGE_SIZE = 40;

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

function buildHref(filters: Partial<PriceListFilters> & { page?: number }) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.unit && filters.unit !== "ALL") params.set("unit", filters.unit);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  const allRowCount = data.categories.reduce((sum, category) => sum + category.rowCount, 0);
  const allProductCount = data.categories.reduce((sum, category) => sum + category.productCount, 0);
  const isPreviewMode = !data.filters.category && !data.filters.q;
  const requestedPage = Math.max(1, Number(searchParams.page) || 1);
  const totalPages = isPreviewMode ? 1 : Math.max(1, Math.ceil(data.totalRows / PRICE_LIST_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  let rowsToSkip = (currentPage - 1) * PRICE_LIST_PAGE_SIZE;
  let rowsToTake = PRICE_LIST_PAGE_SIZE;
  const visibleGroups = isPreviewMode
    ? data.groupedRows.map((group) => ({ ...group, rows: group.rows.slice(0, PRICE_LIST_OVERVIEW_ROWS_PER_GROUP) }))
    : data.groupedRows
        .map((group) => {
          if (rowsToSkip >= group.rows.length) {
            rowsToSkip -= group.rows.length;
            return { ...group, rows: [] };
          }
          const rows = group.rows.slice(rowsToSkip, rowsToSkip + rowsToTake);
          rowsToTake -= rows.length;
          rowsToSkip = 0;
          return { ...group, rows };
        })
        .filter((group) => group.rows.length > 0);
  const visibleRowCount = visibleGroups.reduce((sum, group) => sum + group.rows.length, 0);

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
        <section className="border-b border-border/70 bg-background">
          <div className="container py-4 sm:py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  <FileText className="h-3.5 w-3.5" />
                  Живой прайс
                </div>
                <h1 className="font-display text-2xl font-black leading-tight text-foreground sm:text-3xl">
                  Прайс-лист ПилоРус
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Плотная таблица для закупки: размер, сорт, цена и быстрый плюс в корзину.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                <PriceListSearchAction className="px-2 sm:px-3" label="Поиск" />
                <PriceListPdfDownload href={currentPdfHref} />
                <a
                  href="tel:+74951352026"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Позвонить</span>
                </a>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                {allProductCount} товаров
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1.5">
                <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                {allRowCount} позиций
              </span>
              <span className="rounded-full border border-border bg-card px-2.5 py-1.5">
                Обновлено {formatDateTime(data.latestUpdatedAt)}
              </span>
            </div>
          </div>
        </section>

        <section className="container py-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
              <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-2">
                <div className="mb-2 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Категории</span>
                  <span>{allRowCount}</span>
                </div>
                <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
                  <Link
                    href={buildHref({ q: data.filters.q, unit: data.filters.unit })}
                    className={cn(
                      "inline-flex min-h-9 shrink-0 items-center justify-between gap-3 rounded-lg px-3 text-sm font-semibold transition-colors lg:w-full",
                      !data.filters.category ? "bg-primary text-primary-foreground" : "bg-background/55 hover:bg-accent",
                    )}
                  >
                    Все
                    <span className="text-xs opacity-75">{allRowCount}</span>
                  </Link>
                  {data.categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={buildHref({ category: category.slug, q: data.filters.q, unit: data.filters.unit })}
                      className={cn(
                        "inline-flex min-h-9 shrink-0 items-center justify-between gap-3 rounded-lg px-3 text-sm font-semibold transition-colors lg:w-full",
                        data.filters.category === category.slug ? "bg-primary text-primary-foreground" : "bg-background/55 hover:bg-accent",
                      )}
                    >
                      <span className="max-w-[160px] truncate">{category.name}</span>
                      <span className="text-xs opacity-75">{category.rowCount}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-2">
                <div className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Единица цены
                </div>
                <div className="grid min-w-0 grid-cols-4 gap-1.5 lg:grid-cols-2">
                  <Link
                    href={buildHref({ category: data.filters.category, q: data.filters.q })}
                    className={cn(
                      "rounded-lg border border-border px-2 py-2 text-center text-xs font-bold transition-colors",
                      data.filters.unit === "ALL" ? "bg-primary text-primary-foreground" : "bg-background/55 hover:bg-accent",
                    )}
                  >
                    Все
                  </Link>
                  {(Object.keys(PRICE_LIST_UNITS) as PriceListUnit[]).map((unit) => (
                    <Link
                      key={unit}
                      href={buildHref({ category: data.filters.category, q: data.filters.q, unit })}
                      className={cn(
                        "rounded-lg border border-border px-2 py-2 text-center text-xs font-bold transition-colors",
                        data.filters.unit === unit ? "bg-primary text-primary-foreground" : "bg-background/55 hover:bg-accent",
                      )}
                    >
                      {PRICE_LIST_UNITS[unit].label}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/calculator"
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/15"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Calculator className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-foreground">Калькулятор объёма</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Посчитать м³, штуки и сумму перед заказом
                  </span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              </Link>
            </aside>

            <div className="min-w-0">
              <div className="mb-3 flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    {activeCategory ? activeCategory.name : "Все категории"}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-black text-foreground sm:text-2xl">
                    {data.filters.q ? `Поиск: ${data.filters.q}` : "Актуальные позиции"}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Показано {visibleRowCount} из {data.totalRows}</span>
                  <Link href="/catalog" className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary/80">
                    Каталог
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {isPreviewMode && data.totalRows > visibleRowCount && (
                <div className="mb-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
                  Для скорости показываем первые позиции по категориям. Откройте нужную категорию, чтобы увидеть весь список и быстро добавить в корзину.
                </div>
              )}

              {data.rows.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-lg font-bold text-foreground">Позиции не найдены</p>
                  <p className="mt-2 text-sm text-muted-foreground">Попробуйте убрать фильтр или открыть общий поиск по каталогу.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <PriceListSearchAction label="Открыть поиск" />
                    <Link href="/price-list" className="inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-sm font-semibold">
                      Сбросить
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {visibleGroups.map((group) => {
                    const hiddenRows = Math.max(0, group.category.rowCount - group.rows.length);
                    return (
                      <section key={group.category.slug} className="scroll-mt-24">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="font-display text-lg font-black text-foreground">{group.category.name}</h3>
                          <Link
                            href={buildHref({ category: group.category.slug, unit: data.filters.unit })}
                            className="text-xs font-bold text-primary hover:text-primary/80"
                          >
                            {hiddenRows > 0 ? `Все ${group.category.rowCount}` : `${group.rows.length} поз.`}
                          </Link>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                          <div className="hidden grid-cols-[minmax(0,1.35fr)_82px_134px_90px_118px] gap-3 border-b border-border bg-background/45 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground md:grid">
                            <span>Позиция</span>
                            <span className="text-right">Ед.</span>
                            <span className="text-right">Цена</span>
                            <span className="text-right">Склад</span>
                            <span className="text-right">Заказ</span>
                          </div>

                          {group.rows.map((row, index) => (
                            <div
                              key={row.key}
                              data-price-list-row
                              className={cn(
                                "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-border px-3 py-2.5 md:grid-cols-[minmax(0,1.35fr)_82px_134px_90px_118px] md:items-center",
                                index > 0 && "border-t",
                              )}
                            >
                              <div className="min-w-0">
                                <Link
                                  href={`/product/${row.productSlug}`}
                                  className="line-clamp-1 text-sm font-bold text-foreground hover:text-primary"
                                >
                                  {row.productName}
                                </Link>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">
                                    {row.displaySize}
                                  </span>
                                  {row.grade && (
                                    <span className="rounded-md border border-border px-2 py-0.5 font-semibold text-muted-foreground">
                                      {row.grade}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <PriceListRowActions
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

                              <div className="hidden text-right text-xs text-muted-foreground md:order-4 md:block">
                                {row.stockQty == null ? "в наличии" : `${row.stockQty.toLocaleString("ru-RU")} шт`}
                                {row.piecesPerCube && (
                                  <span className="mt-1 block">≈ {row.piecesPerCube} шт/м³</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                  {!isPreviewMode && totalPages > 1 && (
                    <nav className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-2 text-sm">
                      <Link
                        href={buildHref({
                          category: data.filters.category,
                          q: data.filters.q,
                          unit: data.filters.unit,
                          page: Math.max(1, currentPage - 1),
                        })}
                        className={cn(
                          "inline-flex min-h-10 items-center rounded-lg border border-border px-3 font-semibold transition-colors hover:border-primary/45",
                          currentPage <= 1 && "pointer-events-none opacity-45",
                        )}
                      >
                        Назад
                      </Link>
                      <span className="px-2 text-xs font-bold text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <Link
                        href={buildHref({
                          category: data.filters.category,
                          q: data.filters.q,
                          unit: data.filters.unit,
                          page: Math.min(totalPages, currentPage + 1),
                        })}
                        className={cn(
                          "inline-flex min-h-10 items-center rounded-lg border border-border px-3 font-semibold transition-colors hover:border-primary/45",
                          currentPage >= totalPages && "pointer-events-none opacity-45",
                        )}
                      >
                        Вперёд
                      </Link>
                    </nav>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
