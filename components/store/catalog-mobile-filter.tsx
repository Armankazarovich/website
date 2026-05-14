"use client";

import { useEffect, useState, useRef } from "react";
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
}

export function CatalogMobileFilter({
  categories,
  sizes,
  types,
  currentCategory,
  currentSize,
  currentType,
  currentInStock,
}: CatalogMobileFilterProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [catOpen, setCatOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const dragStartY = useRef(0);
  useAdminOverlayGuard(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Count active filters controlled by this mobile drawer.
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

  const filterLayer = (
    <>
      {/* Floating trigger — sticky left side, middle of screen */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[55] lg:hidden flex flex-col items-center justify-center gap-1 py-3 px-2.5 rounded-r-2xl shadow-xl border-y border-r border-border bg-card/95 backdrop-blur-md transition-all active:scale-95"
        aria-label="Открыть фильтры"
      >
        <SlidersHorizontal className="w-4 h-4 text-foreground" />
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-sm">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[210] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[220] bg-card rounded-t-3xl overflow-hidden"
              style={{ maxHeight: "82dvh", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle — свайп вниз = закрыть */}
              <div
                className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
                onTouchStart={(e) => { dragStartY.current = e.touches[0].clientY; }}
                onTouchEnd={(e) => {
                  const dy = e.changedTouches[0].clientY - dragStartY.current;
                  if (dy > 60) setOpen(false);
                }}
              >
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25 active:bg-muted-foreground/50 transition-colors" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                <p className="font-semibold text-base">Фильтры</p>
                <div className="flex items-center gap-3">
                  {activeCount > 0 && (
                    <button onClick={resetAll} className="text-xs text-primary hover:underline">
                      Сбросить всё
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(82dvh - 160px)" }}>
                <div className="px-5 py-4 space-y-5">

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
              <div className="px-5 py-4 border-t border-border/50 bg-card">
                <button
                  onClick={() => setOpen(false)}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  Показать товары
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <div className="shrink-0 w-0" />
      {mounted ? createPortal(filterLayer, document.body) : null}
    </>
  );
}
