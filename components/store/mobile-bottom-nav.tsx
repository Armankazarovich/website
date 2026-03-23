"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  ShoppingCart,
  Search,
  User,
  SlidersHorizontal,
  X,
  Handshake,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { SearchModal } from "@/components/store/search-modal";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { PartnershipModal } from "@/components/store/partnership-modal";

function MobileFiltersContent({ onClose }: { onClose: () => void }) {
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "";
  const currentSize = searchParams.get("size") ?? "";
  const category = searchParams.get("category") ?? "";
  const [sizes, setSizes] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[] | undefined>(undefined);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    // Загружаем размеры
    fetch("/api/catalog/sizes")
      .then((r) => r.json())
      .then((data) => setSizes(data.sizes ?? []))
      .catch(() => {});
    // Загружаем доступные типы для текущей категории
    const url = category
      ? `/api/catalog/available-types?category=${encodeURIComponent(category)}`
      : "/api/catalog/available-types";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setAvailableTypes(data.types ?? undefined))
      .catch(() => {});
  }, [category]);

  return (
    <CatalogFilters
      currentInStock={false}
      currentSize={currentSize}
      currentType={currentType}
      sizes={sizes}
      availableTypes={availableTypes}
      onClose={onClose}
    />
  );
}

function MobileFiltersSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex justify-end" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Drawer — справа как корзина */}
      <div
        className="relative w-[85vw] max-w-sm h-full bg-background border-l border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg">Фильтры</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть фильтры"
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <Suspense fallback={
            <div className="space-y-3">
              <div className="h-32 bg-muted rounded-2xl animate-pulse" />
              <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            </div>
          }>
            <MobileFiltersContent onClose={onClose} />
          </Suspense>
        </div>

        {/* Нижняя кнопка */}
        <div className="px-5 pb-8 pt-3 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
          >
            Применить фильтры
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const { cartOpen, setCartOpen } = useCartStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [partnershipOpen, setPartnershipOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isOnCatalog = pathname === "/catalog" || pathname.startsWith("/catalog");

  const navItems = [
    {
      id: "catalog",
      icon: LayoutGrid,
      label: "Каталог",
      href: "/catalog",
      action: null,
    },
    ...(isOnCatalog
      ? [
          {
            id: "filters",
            icon: SlidersHorizontal,
            label: "Фильтры",
            href: null,
            action: () => setFiltersOpen(true),
          },
        ]
      : []),
    {
      id: "cart",
      icon: ShoppingCart,
      label: "Корзина",
      href: "/cart",
      action: null,
      badge: totalItems,
    },
    {
      id: "search",
      icon: Search,
      label: "Поиск",
      href: null,
      action: () => setSearchOpen(true),
    },
    {
      id: "account",
      icon: User,
      label: "Кабинет",
      href: "/cabinet",
      action: null,
    },
  ];

  // Haptic feedback helper
  const haptic = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  }, []);

  return (
    <>
      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/90 backdrop-blur-xl border-t border-border/50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-1 pt-1.5 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href
              ? pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
              : false;

            const content = (
              <div
                className={`relative flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 rounded-2xl
                  transition-all duration-150 active:scale-[0.88] active:duration-75
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                  }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Active pill indicator */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}

                {/* Active background glow */}
                {isActive && (
                  <span className="absolute inset-0 rounded-2xl bg-primary/8" />
                )}

                {/* Icon + badge */}
                <div className="relative z-10">
                  <Icon className={`transition-all duration-150 ${isActive ? "w-[22px] h-[22px]" : "w-5 h-5"}`} strokeWidth={isActive ? 2.2 : 1.8} />
                  {mounted && item.badge !== undefined && item.badge > 0 && (
                    <span className={`absolute -top-2 -right-2 ${"badgeColor" in item && item.badgeColor ? item.badgeColor : "bg-primary"} text-white text-[9px] min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center font-bold leading-none`}>
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>

                <span className={`relative z-10 text-[10px] leading-none transition-all duration-150 ${isActive ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.id} href={item.href} onClick={haptic} {...(item.id === "cart" ? { "data-cart-icon": true } : {})}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => { haptic(); item.action?.(); }}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* Filters Sheet (catalog only) */}
      {filtersOpen && (
        <MobileFiltersSheet onClose={() => setFiltersOpen(false)} />
      )}

      {/* Partnership Modal */}
      {partnershipOpen && (
        <PartnershipModal onClose={() => setPartnershipOpen(false)} />
      )}
    </>
  );
}
