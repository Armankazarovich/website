"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { ARAY_ICON_TONE } from "@/lib/aray-design-tokens";
import { useAdminSmartSearch } from "@/components/admin/use-admin-smart-search";

type Props = {
  role: string;
  onCompactSearch: () => void;
  disabledModuleIds?: string[];
};

export function AdminHeaderSearch({ role, onCompactSearch, disabledModuleIds }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const search = useAdminSmartSearch({ role, open, debounceMs: 140, limit: 10, disabledModuleIds });
  const {
    query,
    setQuery,
    selected,
    setSelected,
    results,
    quickItems,
    loading,
    error,
    placeholder,
    activeContextLabel,
    clearQuery,
    reset,
  } = search;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(min-width: 1280px)").matches) {
          setOpen(true);
          window.setTimeout(() => inputRef.current?.focus(), 40);
        } else {
          onCompactSearch();
        }
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCompactSearch]);

  const go = (href: string) => {
    setOpen(false);
    reset();
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) => Math.min(value + 1, Math.max(results.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter" && results[selected]) {
      event.preventDefault();
      go(results[selected].href);
    }
    if (event.key === "Escape") setOpen(false);
  };

  const trimmedQuery = query.trim();
  const showQuick = open && !trimmedQuery && quickItems.length > 0;
  const showResults = open && trimmedQuery.length > 0;
  const showDropdown = showQuick || showResults;

  useEffect(() => {
    if (!showDropdown) {
      setDropdownRect(null);
      return;
    }

    const updateDropdownRect = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 12;
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      setDropdownRect({
        left: Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - width - viewportPadding),
        top: rect.bottom + 8,
        width,
      });
    };

    updateDropdownRect();
    window.addEventListener("resize", updateDropdownRect);
    window.addEventListener("scroll", updateDropdownRect, true);
    document.body.setAttribute("data-admin-header-search-open", "true");

    return () => {
      window.removeEventListener("resize", updateDropdownRect);
      window.removeEventListener("scroll", updateDropdownRect, true);
      document.body.removeAttribute("data-admin-header-search-open");
    };
  }, [showDropdown]);

  const dropdown = showDropdown && mounted && dropdownRect ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[240] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_hsl(var(--foreground)/0.16)]"
      style={{
        left: dropdownRect.left,
        top: dropdownRect.top,
        width: dropdownRect.width,
      }}
    >
      {showQuick && (
        <div className="p-2">
          <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {activeContextLabel}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:border-primary/40 hover:bg-muted/45"
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

      {showResults && (
        <div className="max-h-[min(430px,calc(100dvh-5.5rem))] overflow-y-auto p-1.5">
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <button
                key={result.key}
                type="button"
                onMouseEnter={() => setSelected(index)}
                onClick={() => go(result.href)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selected === index ? "bg-muted/60" : "hover:bg-muted/45"
                }`}
              >
                <span className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-tight text-foreground">
                    {result.title}
                  </span>
                  {result.subtitle && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {result.subtitle}
                    </span>
                  )}
                </span>
                {result.meta && (
                  <span className="hidden shrink-0 rounded-full border border-border bg-muted/35 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                    {result.meta}
                  </span>
                )}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            );
          })}

          {!loading && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Ничего не найдено</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {trimmedQuery.length === 1
                  ? "Введите еще символ или номер заказа."
                  : "Попробуйте номер заказа, телефон, имя, продавца, товар или раздел."}
              </p>
            </div>
          )}

          {error && (
            <div className="mx-2 mb-2 rounded-xl border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
              {error}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={rootRef} className="relative hidden w-full max-w-[56rem] xl:block">
      <div className="flex h-10 items-center gap-3 rounded-2xl border border-border bg-card/65 px-4 text-muted-foreground transition-colors focus-within:border-primary/55 focus-within:bg-card hover:border-primary/35 hover:bg-muted/30">
        <Search className="h-[18px] w-[18px] shrink-0 text-primary" strokeWidth={1.75} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
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
            className="rounded-xl p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Очистить поиск"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="rounded-xl border border-border bg-background/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        )}
      </div>

      {dropdown}
      {false && (showQuick || showResults) && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[70] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_hsl(var(--foreground)/0.16)]">
          {showQuick && (
            <div className="p-2">
              <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {activeContextLabel}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => {
                        setOpen(false);
                        reset();
                      }}
                      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:border-primary/40 hover:bg-muted/45"
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

          {showResults && (
            <div className="max-h-[430px] overflow-y-auto p-1.5">
              {results.map((result, index) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.key}
                    type="button"
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => go(result.href)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      selected === index ? "bg-muted/60" : "hover:bg-muted/45"
                    }`}
                  >
                    <span className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium leading-tight text-foreground">
                        {result.title}
                      </span>
                      {result.subtitle && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </span>
                    {result.meta && (
                      <span className="hidden shrink-0 rounded-full border border-border bg-muted/35 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                        {result.meta}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                );
              })}

              {!loading && results.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">Ничего не найдено</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {trimmedQuery.length === 1
                      ? "Введите еще символ или номер заказа."
                      : "Попробуйте номер заказа, телефон, имя, товар или раздел."}
                  </p>
                </div>
              )}

              {error && (
                <div className="mx-2 mb-2 rounded-xl border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
