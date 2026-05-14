"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { cn } from "@/lib/utils";

interface TypeInfo {
  label: string;
  keyword: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CatalogMobileFilterProps {
  categories: Category[];
  sizes: string[];
  types: TypeInfo[];
  currentCategory?: string;
  currentSize: string;
  currentType: string;
  currentInStock: boolean;
  variant?: "floating" | "inline";
}

export function CatalogMobileFilter({
  categories,
  sizes,
  types,
  currentCategory,
  currentSize,
  currentType,
  currentInStock,
  variant = "floating",
}: CatalogMobileFilterProps) {
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const [portalReady, setPortalReady] = useState(false);
  useAdminOverlayGuard(open);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCount = [currentCategory, currentSize, currentType, currentInStock ? "instock" : ""].filter(Boolean).length;

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleInstock = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentInStock) {
      params.delete("instock");
    } else {
      params.set("instock", "1");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const resetAll = () => {
    router.push(pathname);
    setOpen(false);
  };

  return (
    <>
      {/* Floating trigger — fixed left side on mobile */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative lg:hidden transition-all active:scale-95",
          variant === "inline"
            ? "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent"
            : "fixed left-0 top-1/2 z-[60] flex h-11 w-8 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-r-xl border-y border-r border-border bg-card px-1.5 py-2 text-foreground hover:translate-x-0.5 hover:border-primary/45"
        )}
        aria-label="Открыть фильтры"
      >
        <SlidersHorizontal className="w-4 h-4 text-foreground" />
        {activeCount > 0 && (
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground",
              "absolute -right-1 -top-1"
            )}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Spacer — placeholder where inline button was (keeps InstockToggle row intact) */}
      {variant === "floating" && <div className="shrink-0 w-0" />}

      {portalReady ? createPortal(
        <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[210] bg-background/65"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed inset-y-0 left-0 z-[220] flex w-[min(88vw,380px)] max-w-[380px] flex-col overflow-hidden border-r border-border bg-card shadow-2xl shadow-black/35"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 34, stiffness: 360 }}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold leading-tight">Фильтры</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Категория, размер, наличие</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {activeCount > 0 && (
                    <button onClick={resetAll} className="rounded-xl border border-primary/25 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                      Сбросить
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Закрыть фильтры"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="space-y-5 px-4 py-4">

                  {/* В наличии toggle */}
                  <button
                    onClick={toggleInstock}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all",
                      currentInStock
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-3 h-3 rounded-full transition-colors",
                        currentInStock ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      <span className="text-sm font-medium">Только в наличии</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full transition-colors relative",
                      currentInStock ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        currentInStock ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>

                  {/* Categories */}
                  <div>
                    <button
                      onClick={() => setCatOpen(!catOpen)}
                      className="w-full flex items-center justify-between py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Категория
                      {catOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {catOpen && (
                      <div className="mt-2 space-y-1">
                        <button
                          onClick={() => { setParam("category", null); }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                            !currentCategory
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          Все категории
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { setParam("category", cat.slug); }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                              currentCategory === cat.slug
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sizes — smart grouped */}
                  {sizes.length > 0 && (
                    <div>
                      <button
                        onClick={() => setSizeOpen(!sizeOpen)}
                        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        Размеры
                        {sizeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {sizeOpen && (
                        <div className="mt-2 max-h-[260px] overflow-y-auto scrollbar-thin space-y-2">
                          {sizes.map(size => (
                            <button
                              key={size}
                              onClick={() => setParam("size", currentSize === size ? null : size)}
                              className={cn(
                                "inline-flex mr-1.5 mb-1.5 px-3 py-2.5 rounded-lg text-sm font-mono border transition-all",
                                currentSize === size
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Types */}
                  {types.length > 0 && (
                    <div>
                      <p className="py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Тип</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {types.map(t => (
                          <button
                            key={t.keyword}
                            onClick={() => setParam("type", currentType === t.keyword ? null : t.keyword)}
                            className={cn(
                              "px-3 py-2.5 rounded-lg text-sm border transition-all",
                              currentType === t.keyword
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 py-3">
                <button
                  onClick={() => setOpen(false)}
                  className="h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                >
                  Показать товары
                </button>
              </div>
            </motion.div>
          </>
        )}
        </AnimatePresence>,
        document.body,
      ) : null}
    </>
  );
}
