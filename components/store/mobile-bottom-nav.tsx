"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ShoppingCart,
  Search,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAccountDrawer } from "@/store/account-drawer";
import { useFiltersDrawer } from "@/store/filters-drawer";
import { useSearchDrawer } from "@/store/search-drawer";


export function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const totalPrice = useCartStore((s) => s.totalPrice());
  const { setCartOpen } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const prevItemsRef = useRef(0);
  const { toggle: toggleAccount } = useAccountDrawer();
  const { toggle: toggleFilters } = useFiltersDrawer();
  const { toggle: toggleSearch } = useSearchDrawer();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (totalItems !== prevItemsRef.current) {
      if (totalItems > prevItemsRef.current) {
        setCartBounce(true);
        setTimeout(() => setCartBounce(false), 600);
      }
      prevItemsRef.current = totalItems;
    }
  }, [totalItems, mounted]);

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
            action: () => toggleFilters(),
          },
        ]
      : []),
    {
      id: "cart",
      icon: ShoppingCart,
      label: "Корзина",
      href: null,
      action: () => setCartOpen(true),
      badge: totalItems,
    },
    {
      id: "search",
      icon: Search,
      label: "Поиск",
      href: null,
      action: () => toggleSearch(),
    },
    {
      id: "account",
      icon: User,
      label: "Кабинет",
      href: null,
      action: () => toggleAccount(),
    },
  ];

  const haptic = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden safe-area-inset-bottom"
      style={{
        backdropFilter: "blur(32px) saturate(160%)",
        WebkitBackdropFilter: "blur(32px) saturate(160%)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "var(--mobile-nav-bg)",
      } as React.CSSProperties}
    >
      {/* Top shine line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      <div className="flex items-center justify-around px-1 pt-2 pb-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href
            ? pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            : false;
          const isCart = item.id === "cart";
          const hasCartItems = mounted && isCart && item.badge !== undefined && item.badge > 0;

          const content = (
            <motion.div
              whileTap={{ scale: 0.72 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className={`relative flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5
                ${isActive ? "text-brand-orange" : "text-muted-foreground"}`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >

              {/* Icon + badge */}
              <motion.div
                animate={
                  isCart && cartBounce
                    ? { scale: [1, 1.35, 0.9, 1.15, 1] }
                    : isActive
                    ? { scale: 1.1 }
                    : { scale: 1 }
                }
                transition={
                  isCart && cartBounce
                    ? { duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1] }
                    : { type: "spring", stiffness: 400, damping: 20 }
                }
                className={`relative ${hasCartItems && !isActive ? "text-brand-orange" : ""}`}
                {...(isCart ? { "data-cart-icon": true } : {})}
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.3 : 1.7}
                />
                {mounted && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-brand-orange text-white text-[9px] min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center font-bold leading-none shadow-sm shadow-brand-orange/40">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </motion.div>

              <span className={`text-[10px] leading-none tabular-nums ${isActive ? "font-bold" : "font-medium"}`}>
                {isCart && mounted && totalItems > 0
                  ? formatPrice(totalPrice)
                  : item.label}
              </span>
            </motion.div>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} onClick={haptic}>
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
  );
}
