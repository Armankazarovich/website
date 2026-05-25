"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  GitCompareArrows,
  Heart,
  Layers3,
  PackageOpen,
  Trash2,
  X,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { useFloatingChromeHidden } from "@/lib/use-floating-ui";
import { isProductVariantPurchasable } from "@/lib/product-availability";
import { useCompareStore, type CompareItem } from "@/store/compare";
import { useWishlistStore, type WishlistItem } from "@/store/wishlist";

type SelectionTab = "compare" | "wishlist";
type SelectionItem = CompareItem | WishlistItem;

function itemHref(item: SelectionItem) {
  return `/product/${item.slug}`;
}

function itemPrice(item: SelectionItem) {
  const variant = item.variants.find(isProductVariantPurchasable) ?? item.variants[0];
  if (!variant) return null;
  const price = variant.pricePerPiece ?? variant.pricePerCube;
  if (!price) return null;
  const unit = variant.pricePerPiece ? "шт" : "м³";
  return `${formatPrice(price)} / ${unit}`;
}

function SelectionCard({
  item,
  label,
  onRemove,
  onNavigate,
}: {
  item: SelectionItem;
  label: string;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const price = itemPrice(item);

  return (
    <article className="group rounded-2xl border border-border bg-background/70 p-2.5 transition-colors hover:border-primary/35">
      <div className="flex gap-3">
        <Link
          href={itemHref(item)}
          onClick={onNavigate}
          className="relative flex h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
          aria-label={item.name}
        >
          {item.images[0] ? (
            <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <PackageOpen className="h-5 w-5" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Link href={itemHref(item)} onClick={onNavigate} className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                {label}
              </span>
              <strong className="mt-0.5 block line-clamp-2 text-sm leading-5 text-foreground">
                {item.name}
              </strong>
            </Link>
            <button
              type="button"
              onClick={onRemove}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Убрать"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-muted-foreground">{item.category}</span>
            {price && <span className="shrink-0 text-xs font-semibold text-primary">{price}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

export function CompareDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SelectionTab>("compare");
  const compareItems = useCompareStore((state) => state.items);
  const hydrateCompare = useCompareStore((state) => state.hydrateCompare);
  const removeCompare = useCompareStore((state) => state.remove);
  const wishlistItems = useWishlistStore((state) => state.items);
  const hydrateWishlist = useWishlistStore((state) => state.hydrateWishlist);
  const removeWishlist = useWishlistStore((state) => state.remove);
  const floatingChromeHidden = useFloatingChromeHidden();
  useAdminOverlayGuard(open);

  useEffect(() => {
    hydrateCompare();
    hydrateWishlist();
  }, [hydrateCompare, hydrateWishlist]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const compareCount = compareItems.length;
  const wishlistCount = wishlistItems.length;
  const showCompare = compareCount > 0 && !pathname.startsWith("/compare");
  const showWishlist = wishlistCount > 0 && !pathname.startsWith("/wishlist");
  const visibleCount = (showCompare ? compareCount : 0) + (showWishlist ? wishlistCount : 0);
  const safeActiveTab: SelectionTab =
    activeTab === "compare" && showCompare
      ? "compare"
      : activeTab === "wishlist" && showWishlist
      ? "wishlist"
      : showCompare
      ? "compare"
      : "wishlist";
  const activeItems = safeActiveTab === "compare" ? compareItems : wishlistItems;
  const activeHref = safeActiveTab === "compare" ? "/compare" : "/wishlist";
  const activeTitle = safeActiveTab === "compare" ? "Сравнение" : "Избранное";

  useEffect(() => {
    if (safeActiveTab !== activeTab) setActiveTab(safeActiveTab);
  }, [activeTab, safeActiveTab]);

  if (visibleCount === 0 || (floatingChromeHidden && !open)) return null;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.96 }}
        className="fixed right-0 top-1/2 z-[49] flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-2xl border-y border-l border-border bg-card/95 px-1.5 py-2.5 text-foreground shadow-xl sm:hidden"
        aria-label="Открыть мой выбор"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Layers3 className="h-3.5 w-3.5" />
        </span>
        <span className="flex flex-col items-center gap-1">
          {showCompare && (
            <span data-compare-icon className="relative flex h-6 w-6 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
              <GitCompareArrows className="h-3.5 w-3.5" />
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground">
                {compareCount > 9 ? "9+" : compareCount}
              </span>
            </span>
          )}
          {showWishlist && (
            <span className="relative flex h-6 w-6 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
              <Heart className="h-3.5 w-3.5" />
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground">
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            </span>
          )}
        </span>
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          выбор
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-background/70 sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-[71] flex w-[min(88vw,360px)] flex-col overflow-hidden rounded-l-3xl border-l border-border bg-card text-card-foreground shadow-2xl sm:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 310 }}
              aria-label="Мой выбор"
            >
              <div className="border-b border-border px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top,1rem))]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Мой выбор
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold leading-tight">
                      {visibleCount} товар{visibleCount === 1 ? "" : visibleCount < 5 ? "а" : "ов"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Закрыть"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background/60 p-1">
                  <button
                    type="button"
                    disabled={!showCompare}
                    onClick={() => setActiveTab("compare")}
                    className={cn(
                      "store-control-chip disabled:opacity-45",
                      safeActiveTab === "compare" && "is-selected",
                    )}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    {compareCount}
                  </button>
                  <button
                    type="button"
                    disabled={!showWishlist}
                    onClick={() => setActiveTab("wishlist")}
                    className={cn(
                      "store-control-chip disabled:opacity-45",
                      safeActiveTab === "wishlist" && "is-selected",
                    )}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    {wishlistCount}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-2.5">
                  {activeItems.map((item) => (
                    <SelectionCard
                      key={`${safeActiveTab}-${item.id}`}
                      item={item}
                      label={activeTitle}
                      onNavigate={() => setOpen(false)}
                      onRemove={() => {
                        if (safeActiveTab === "compare") removeCompare(item.id);
                        else removeWishlist(item.id);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-border p-3" style={{ paddingBottom: "max(0.85rem, env(safe-area-inset-bottom, 0.85rem))" }}>
                <Link
                  href={activeHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Открыть {safeActiveTab === "compare" ? "сравнение" : "избранное"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
