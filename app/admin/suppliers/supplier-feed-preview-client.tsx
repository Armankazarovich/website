"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

type SupplierOption = {
  id: string;
  name: string;
  slug: string;
  sourceUrl: string | null;
  website: string | null;
};

type PreviewRow = {
  feedId: string;
  name: string;
  price: number;
  category: string;
  size: string;
  url: string;
  confidence: "high" | "medium" | "low" | "unmatched";
  score: number;
  matchedProduct: string;
  matchedSlug: string;
  matchedVariantId: string;
  matchedVariantSize: string;
  compareUnit: string;
  piloComparedPrice: number | null;
  diffVsPiloBestUnitPct: number | null;
  candidates: Array<{ score: number; product: string; slug: string; size: string; pricePerCube: number | null; pricePerPiece: number | null }>;
};

type PreviewResult = {
  source: string;
  shop: string;
  feedDate: string;
  feedOffers: number;
  feedCategories: number;
  localActiveProducts: number;
  localVariants: number;
  offersWithParsedSize: number;
  matchCounts: Record<"high" | "medium" | "low" | "unmatched", number>;
  avgHighMatchPriceDiffVsPiloBestUnitPct: number | null;
  unmatchedCategories: Array<{ name: string; count: number }>;
  samples: {
    high: PreviewRow[];
    medium: PreviewRow[];
    low: PreviewRow[];
    unmatched: PreviewRow[];
  };
};

type Props = {
  suppliers: SupplierOption[];
};

type ApplyResult = {
  ok: boolean;
  applied: number;
  created: number;
  updated: number;
  skipped: number;
  appliedRows: Array<{ feedId: string; product: string; size: string; unit: string; price: number }>;
};

function suggestedFeedUrl(supplier?: SupplierOption) {
  if (!supplier) return "";
  if (supplier.slug === "pilmos") return "https://pilmos.ru/wp-content/uploads/feed001.xml";
  return supplier.sourceUrl || supplier.website || "";
}

function formatMoney(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "по запросу";
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "н/д";
  return `${value > 0 ? "+" : ""}${value}%`;
}

const confidenceLabels: Record<PreviewRow["confidence"], string> = {
  high: "Уверенно",
  medium: "Проверить",
  low: "Слабо",
  unmatched: "Нет пары",
};

export function SupplierFeedPreviewClient({ suppliers }: Props) {
  const defaultSupplier = suppliers.find((supplier) => supplier.slug === "pilmos") || suppliers[0];
  const [supplierId, setSupplierId] = useState(defaultSupplier?.id || "");
  const selectedSupplier = useMemo(() => suppliers.find((supplier) => supplier.id === supplierId), [supplierId, suppliers]);
  const [feedUrl, setFeedUrl] = useState(suggestedFeedUrl(defaultSupplier));
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFeedIds, setSelectedFeedIds] = useState<Set<string>>(new Set());
  const [applyConfirmed, setApplyConfirmed] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  function handleSupplierChange(value: string) {
    setSupplierId(value);
    const supplier = suppliers.find((item) => item.id === value);
    setFeedUrl(suggestedFeedUrl(supplier));
    setResult(null);
    setError(null);
    setSelectedFeedIds(new Set());
    setApplyConfirmed(false);
    setApplyResult(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedFeedIds(new Set());
    setApplyConfirmed(false);
    setApplyResult(null);
    try {
      const response = await fetch("/api/admin/suppliers/feed-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, feedUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Preview не удалось выполнить");
      setResult(payload);
      setSelectedFeedIds(new Set((payload?.samples?.high || []).map((row: PreviewRow) => row.feedId).filter(Boolean)));
    } catch (err: any) {
      setError(err?.message || "Preview не удалось выполнить");
    } finally {
      setLoading(false);
    }
  }

  function toggleFeedId(feedId: string) {
    setSelectedFeedIds((current) => {
      const next = new Set(current);
      if (next.has(feedId)) next.delete(feedId);
      else next.add(feedId);
      return next;
    });
    setApplyResult(null);
  }

  async function applySelected() {
    if (!result || selectedFeedIds.size === 0 || !applyConfirmed) return;
    setApplyLoading(true);
    setError(null);
    setApplyResult(null);
    try {
      const response = await fetch("/api/admin/suppliers/feed-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          feedUrl: result.source,
          apply: true,
          applyConfirm: "APPLY_VENDOR_FEED_PREVIEW",
          selectedFeedIds: [...selectedFeedIds],
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Не удалось применить выбранные строки");
      setApplyResult(payload);
      setApplyConfirmed(false);
    } catch (err: any) {
      setError(err?.message || "Не удалось применить выбранные строки");
    } finally {
      setApplyLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Preview feed продавца</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Сверка YML/XML показывает совпадения с текущим каталогом, разницу цен и позиции, которые нельзя применять автоматически.
          </p>
        </div>
        {result ? (
          <span className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Preview готов
          </span>
        ) : null}
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] lg:items-end">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Продавец</span>
          <select
            value={supplierId}
            onChange={(event) => handleSupplierChange(event.target.value)}
            className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
          >
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Feed URL</span>
          <input
            value={feedUrl}
            onChange={(event) => setFeedUrl(event.target.value)}
            placeholder="https://example.ru/feed.xml"
            className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !feedUrl.trim() || !supplierId}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          Preview
        </button>
      </form>

      {selectedSupplier?.sourceUrl && feedUrl !== selectedSupplier.sourceUrl ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Сайт продавца для общего скана: {selectedSupplier.sourceUrl}
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            <PreviewMetric label="Feed товаров" value={result.feedOffers} hint={`${result.feedCategories} категорий`} />
            <PreviewMetric label="С размером" value={result.offersWithParsedSize} hint="можно сопоставлять" />
            <PreviewMetric label="Уверенно" value={result.matchCounts.high} hint={`${result.matchCounts.medium} на проверку`} tone="good" />
            <PreviewMetric label="Без пары" value={result.matchCounts.unmatched} hint="нужна ручная разметка" tone="warn" />
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{result.shop || "Feed продавца"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.feedDate ? `Дата feed: ${result.feedDate}` : "Дата feed не указана"} · средняя разница по уверенным совпадениям {formatPct(result.avgHighMatchPriceDiffVsPiloBestUnitPct)}
                </p>
              </div>
              <a href={result.source} target="_blank" rel="noreferrer" className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground hover:bg-accent">
                <ExternalLink className="h-3.5 w-3.5" />
                Открыть feed
              </a>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_0.8fr]">
            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="font-display text-base font-semibold text-foreground">Уверенные совпадения</h3>
              <div className="mt-3 divide-y divide-border">
                {result.samples.high.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">Уверенных совпадений пока нет.</p>
                ) : (
                  result.samples.high.map((row) => (
                    <PreviewRowItem
                      key={`${row.feedId}-${row.name}`}
                      row={row}
                      selected={selectedFeedIds.has(row.feedId)}
                      onToggle={() => toggleFeedId(row.feedId)}
                    />
                  ))
                )}
              </div>
              {result.samples.high.length > 0 ? (
                <div className="mt-4 rounded-xl border border-primary/25 bg-primary/10 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Применение выбранных строк</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Применяются только отмеченные уверенные строки. Товар не создается, витрина не публикуется, цена записывается в предложение продавца.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={applyConfirmed}
                        onChange={(event) => setApplyConfirmed(event.target.checked)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Подтверждаю применение
                    </label>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">Выбрано: {selectedFeedIds.size}</p>
                    <button
                      type="button"
                      onClick={applySelected}
                      disabled={applyLoading || !applyConfirmed || selectedFeedIds.size === 0}
                      className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {applyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Применить выбранные
                    </button>
                  </div>
                  {applyResult ? (
                    <div className="mt-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                      Применено: {applyResult.applied}. Создано: {applyResult.created}. Обновлено: {applyResult.updated}. Пропущено: {applyResult.skipped}.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="font-display text-base font-semibold text-foreground">Категории без пары</h3>
              <div className="mt-3 grid gap-2">
                {result.unmatchedCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Проблемных категорий не найдено.</p>
                ) : (
                  result.unmatchedCategories.map((category) => (
                    <div key={category.name} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-foreground">{category.name}</span>
                      <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">{category.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="font-display text-base font-semibold text-foreground">Нужна ручная проверка</h3>
            <div className="mt-3 divide-y divide-border">
              {[...result.samples.medium, ...result.samples.low, ...result.samples.unmatched].slice(0, 14).map((row) => (
                <PreviewRowItem key={`${row.confidence}-${row.feedId}-${row.name}`} row={row} compact />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreviewMetric({ label, value, hint, tone = "default" }: { label: string; value: number; hint: string; tone?: "default" | "good" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold text-foreground", tone === "good" && "text-emerald-300", tone === "warn" && "text-amber-300")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function PreviewRowItem({
  row,
  compact = false,
  selected,
  onToggle,
}: {
  row: PreviewRow;
  compact?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const bestCandidate = row.candidates[0];
  const matchText = row.matchedProduct ? `${row.matchedProduct} · ${row.matchedVariantSize}` : bestCandidate ? `${bestCandidate.product} · ${bestCandidate.size}` : "пары нет";

  return (
    <div className={cn("grid gap-2 py-3", compact ? "lg:grid-cols-[minmax(0,1.2fr)_0.8fr_0.35fr]" : "lg:grid-cols-[minmax(0,1.1fr)_1fr_0.5fr]")}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {onToggle ? (
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={onToggle}
              className="h-4 w-4 shrink-0 rounded border-border accent-primary"
              aria-label={`Выбрать ${row.name}`}
            />
          ) : null}
          <p className="truncate font-medium text-foreground">{row.name}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{row.category || "Без категории"} · {row.size || "размер не указан"}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{matchText}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Feed {formatMoney(row.price)} · ПилоРус {formatMoney(row.piloComparedPrice)} {row.compareUnit || ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span className={cn("rounded-full border px-2 py-1 text-xs font-semibold", row.confidence === "high" ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" : row.confidence === "unmatched" ? "border-amber-500/35 bg-amber-500/10 text-amber-300" : "border-border bg-card text-muted-foreground")}>
          {confidenceLabels[row.confidence]}
        </span>
        <span className="text-xs text-muted-foreground">{formatPct(row.diffVsPiloBestUnitPct)}</span>
      </div>
    </div>
  );
}
