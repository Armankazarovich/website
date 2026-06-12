"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { SidePanel } from "@/components/store/side-panel";
import { ARAY_ICON_TONE } from "@/lib/aray-design-tokens";
import { useAdminSmartSearch, type AdminSmartSearchResult } from "@/components/admin/use-admin-smart-search";

type Props = {
  open: boolean;
  onClose: () => void;
  role: string;
  disabledModuleIds?: string[];
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function ResultLink({
  result,
  selected = false,
  onMouseEnter,
  onClose,
}: {
  result: AdminSmartSearchResult;
  selected?: boolean;
  onMouseEnter?: () => void;
  onClose: () => void;
}) {
  const Icon = result.icon;

  return (
    <Link
      href={result.href}
      onClick={onClose}
      onMouseEnter={onMouseEnter}
      className={`group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        selected ? "bg-muted/65" : "hover:bg-muted/50"
      }`}
    >
      <span className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight text-foreground">{result.title}</span>
        {result.subtitle && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.subtitle}</span>
        )}
      </span>
      {result.meta && (
        <span className="hidden shrink-0 rounded-full border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          {result.meta}
        </span>
      )}
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

export function AdminSearchPanel({ open, onClose, role, disabledModuleIds }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useAdminSmartSearch({ role, open, debounceMs: 150, limit: 12, disabledModuleIds });
  const {
    query,
    setQuery,
    selected,
    setSelected,
    results,
    quickItems,
    queryHints,
    loading,
    error,
    placeholder,
    activeContextLabel,
    clearQuery,
    reset,
  } = search;

  useEffect(() => {
    if (!open) return;
    reset();
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        clearQuery();
      } else {
        handleClose();
      }
      return;
    }

    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) => Math.min(value + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const href = results[selected]?.href || results[0].href;
      handleClose();
      router.push(href);
    }
  };

  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <SidePanel
      open={open}
      onClose={handleClose}
      title="Поиск"
      subtitle="Разделы, товары, продавцы, заказы, клиенты"
      icon={<Search className="h-4 w-4" strokeWidth={2} />}
      iconTone={ARAY_ICON_TONE}
      maxWidth="520px"
      panelClassName="admin-popup-liquid border-border bg-card"
      side="right"
    >
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex h-11 items-center gap-3 rounded-xl border border-border bg-background/70 px-4 transition-colors focus-within:border-primary/50">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            style={{ fontSize: 16 }}
            autoComplete="off"
            spellCheck={false}
          />
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                clearQuery();
                inputRef.current?.focus();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Очистить поиск"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>

        {!hasQuery && (
          <>
            {quickItems.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>{activeContextLabel}</SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {quickItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={handleClose}
                        className="group flex min-h-16 items-center gap-3 rounded-xl border border-border bg-background/55 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98]"
                      >
                        <span className={`${ARAY_ICON_TONE} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
                          <Icon className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <SectionTitle>Запросы</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {queryHints.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setQuery(hint)}
                    className="min-h-10 rounded-full border border-border bg-muted/35 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground active:scale-[0.98]"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {hasQuery && (
          <div className="space-y-3">
            {hasResults && (
              <div className="space-y-2">
                <SectionTitle>Результаты</SectionTitle>
                <div className="rounded-2xl border border-border bg-background/35 p-1.5">
                  {results.map((result, index) => (
                    <ResultLink
                      key={result.key}
                      result={result}
                      selected={selected === index}
                      onMouseEnter={() => setSelected(index)}
                      onClose={handleClose}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && !hasResults && (
              <div className="rounded-2xl border border-dashed border-border bg-background/30 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">По запросу «{query.trim()}» ничего не найдено</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {query.trim().length === 1
                    ? "Введите еще символ или номер заказа."
                    : "Попробуйте номер заказа, телефон, имя клиента, продавца, название товара или раздел админки."}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {queryHints.slice(0, 3).map((hint) => (
                    <button
                      key={hint}
                      type="button"
                      onClick={() => setQuery(hint)}
                      className="min-h-9 rounded-full border border-border bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
