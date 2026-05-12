"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";

type ProductTypeAdminItem = {
  label: string;
  keyword: string;
  active?: boolean;
  sortOrder?: number;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  count?: number;
  examples?: string[];
};

function cleanItems(items: ProductTypeAdminItem[]) {
  return [...items].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, "ru"),
  );
}

function buildAutoSeo(item: ProductTypeAdminItem): ProductTypeAdminItem {
  const label = item.label.trim() || "Материал";
  return {
    ...item,
    seoTitle: `${label} — купить в Химках с доставкой`,
    seoDescription: `${label} от производителя в Химках. Актуальные размеры, цены, наличие и доставка по Москве и Московской области.`,
    description:
      item.description?.trim() ||
      `${label} подбирают по породе, размеру, влажности и условиям эксплуатации. На странице собраны актуальные позиции ПилоРус с ценами, наличием и вариантами для заказа с доставкой по Москве и Московской области.`,
  };
}

export default function AdminProductTypesPage() {
  const [items, setItems] = useState<ProductTypeAdminItem[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const selected = useMemo(
    () => items.find((item) => item.keyword === selectedKeyword) ?? items[0] ?? null,
    [items, selectedKeyword],
  );

  const visibleCount = items.filter((item) => item.active !== false).length;
  const hiddenCount = items.length - visibleCount;
  const productCount = items.reduce((sum, item) => sum + (item.count ?? 0), 0);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/product-types", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Не удалось загрузить типы товаров");
      const nextItems = cleanItems(data.items ?? []);
      setItems(nextItems);
      setSelectedKeyword((current) => current || nextItems[0]?.keyword || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить типы товаров");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateItem = (keyword: string, patch: Partial<ProductTypeAdminItem>) => {
    setSaved(false);
    setItems((prev) =>
      prev.map((item) => (item.keyword === keyword ? { ...item, ...patch } : item)),
    );
  };

  const moveItem = (keyword: string, direction: -1 | 1) => {
    setSaved(false);
    setItems((prev) => {
      const ordered = cleanItems(prev);
      const index = ordered.findIndex((item) => item.keyword === keyword);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return prev;
      const current = ordered[index];
      const swap = ordered[swapIndex];
      ordered[index] = { ...swap, sortOrder: index };
      ordered[swapIndex] = { ...current, sortOrder: swapIndex };
      return cleanItems(ordered.map((item, sortOrder) => ({ ...item, sortOrder })));
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const normalized = cleanItems(items).map((item, sortOrder) => ({ ...item, sortOrder }));
      const res = await fetch("/api/admin/product-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Не удалось сохранить типы товаров");
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить типы товаров");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-frame admin-page-frame-readable">
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-frame admin-page-frame-fluid pb-24">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            Каталог и SEO
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
            Типы товаров
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Управляйте фильтрами каталога, текстами разделов и SEO для типов материалов. Товары попадают в типы автоматически по названию, а витрина берет отсюда название, видимость и описание.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Видимых типов</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{visibleCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Скрыто</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{hiddenCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Товаров распознано</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{productCount}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
          Настройки сохранены. Каталог, меню и sitemap обновятся автоматически.
        </div>
      )}

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Tags className="h-4 w-4 text-primary" />
              Список типов
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Скрытые типы не показываются в фильтрах, меню и sitemap.
            </p>
          </div>
          <div className="max-h-[70dvh] space-y-2 overflow-y-auto p-3">
            {cleanItems(items).map((item) => {
              const active = item.active !== false;
              const selectedItem = selected?.keyword === item.keyword;
              return (
                <button
                  key={item.keyword}
                  type="button"
                  onClick={() => setSelectedKeyword(item.keyword)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedItem
                      ? "border-primary/45 bg-primary/10"
                      : "border-border bg-background/45 hover:border-primary/25 hover:bg-primary/5"
                  } ${active ? "" : "opacity-60"}`}
                >
                  <span className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                      active ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
                    }`}>
                      {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{item.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.keyword} · {item.count ?? 0} тов.
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card">
          {selected ? (
            <>
              <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-foreground">{selected.label}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    URL-фильтр: <span className="font-mono">{selected.keyword}</span> · {selected.count ?? 0} товаров
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(selected.keyword, -1)}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-accent"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    Вверх
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(selected.keyword, 1)}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-accent"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Вниз
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItem(selected.keyword, { active: selected.active === false })}
                    className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                      selected.active === false
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {selected.active === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {selected.active === false ? "Показать" : "Скрыть"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItem(selected.keyword, buildAutoSeo(selected))}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Авто SEO
                  </button>
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Название в фильтрах</span>
                    <input
                      value={selected.label}
                      onChange={(event) => updateItem(selected.keyword, { label: event.target.value })}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary/45"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <span>Описание раздела</span>
                      <span>{selected.description?.length ?? 0}/2400</span>
                    </span>
                    <textarea
                      value={selected.description ?? ""}
                      onChange={(event) => updateItem(selected.keyword, { description: event.target.value })}
                      rows={8}
                      maxLength={2400}
                      className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors focus:border-primary/45"
                      placeholder="Текст будет показан на странице каталога при выборе этого типа."
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <span>SEO title</span>
                        <span>{selected.seoTitle?.length ?? 0}/120</span>
                      </span>
                      <input
                        value={selected.seoTitle ?? ""}
                        onChange={(event) => updateItem(selected.keyword, { seoTitle: event.target.value })}
                        maxLength={120}
                        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary/45"
                        placeholder={`${selected.label} — купить в Химках`}
                      />
                    </label>
                    <label className="block">
                      <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <span>SEO description</span>
                        <span>{selected.seoDescription?.length ?? 0}/220</span>
                      </span>
                      <textarea
                        value={selected.seoDescription ?? ""}
                        onChange={(event) => updateItem(selected.keyword, { seoDescription: event.target.value })}
                        rows={4}
                        maxLength={220}
                        className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-5 text-foreground outline-none transition-colors focus:border-primary/45"
                        placeholder="Короткое описание для Яндекса и Google."
                      />
                    </label>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-border bg-background/45 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Search className="h-4 w-4 text-primary" />
                      Примеры товаров
                    </h3>
                    <div className="mt-3 space-y-2">
                      {(selected.examples ?? []).length > 0 ? (
                        selected.examples?.map((example) => (
                          <p key={example} className="rounded-xl border border-border bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
                            {example}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs leading-5 text-muted-foreground">
                          Пока нет товаров, которые попали в этот тип. Тип можно оставить скрытым до наполнения.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/45 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Где это используется
                    </h3>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                      <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Фильтры каталога и меню “Тип материала”.</li>
                      <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> SEO title/description для страниц вида /catalog?type=...</li>
                      <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Sitemap для автоматической индексации типов и связок категория + тип.</li>
                    </ul>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Типы товаров не найдены.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
