"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CatalogMobileFilterProps {
  categories: Category[];
  sizes: string[];
  availableTypes: string[];
  currentCategory?: string;
  currentSize: string;
  currentType: string;
  currentInStock: boolean;
}

export function CatalogMobileFilter({
  categories,
  sizes,
  availableTypes,
  currentCategory,
  currentSize,
  currentType,
  currentInStock,
}: CatalogMobileFilterProps) {
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Count active filters (instock excluded — has its own separate toggle button)
  const activeCount = [currentCategory, currentSize, currentType].filter(Boolean).length;

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
      {/* Floating trigger — sticky left side, middle of screen */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 lg:hidden flex flex-col items-center justify-center gap-1 py-3 px-2.5 rounded-r-2xl shadow-xl transition-all active:scale-95"
        style={{
          background: "var(--mobile-nav-bg, rgba(20,20,20,0.92))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
        aria-label="Открыть фильтры"
      >
        <SlidersHorizontal className="w-4 h-4 text-foreground" />
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
            {activeCount}
          </span>
        )}
      </button>

      {/* Spacer — placeholder where inline button was (keeps InstockToggle row intact) */}
      <div className="shrink-0 w-0" />

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-hidden"
              style={{ maxHeight: "82dvh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
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
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border hover:border-emerald-500/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-3 h-3 rounded-full transition-colors",
                        currentInStock ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      <span className="text-sm font-medium">Только в наличии</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full transition-colors relative",
                      currentInStock ? "bg-emerald-500" : "bg-muted"
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

                  {/* Sizes */}
                  {sizes.length > 0 && (
                    <div>
                      <button
                        onClick={() => setSizeOpen(!sizeOpen)}
                        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        Сечение
                        {sizeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {sizeOpen && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {sizes.map(size => (
                            <button
                              key={size}
                              onClick={() => setParam("size", currentSize === size ? null : size)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-sm border transition-all",
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
                  {availableTypes.length > 0 && (
                    <div>
                      <p className="py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Тип</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableTypes.map(type => (
                          <button
                            key={type}
                            onClick={() => setParam("type", currentType === type ? null : type)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm border capitalize transition-all",
                              currentType === type
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            {type}
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
}
