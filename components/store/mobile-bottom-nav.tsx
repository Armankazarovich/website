"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
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
  const [arayPulse, setArayPulse] = useState(false);
  const prevItemsRef = useRef(0);
  const { toggle: toggleAccount } = useAccountDrawer();
  const { toggle: toggleFilters } = useFiltersDrawer();
  const { toggle: toggleSearch } = useSearchDrawer();

  useEffect(() => { setMounted(true); }, []);

  // Bounce корзины при добавлении
  useEffect(() => {
    if (!mounted) return;
    if (totalItems !== prevItemsRef.current) {
      if (totalItems > prevItemsRef.current) {
        setCartBounce(true);
        setArayPulse(true);
        setTimeout(() => setCartBounce(false), 600);
        setTimeout(() => setArayPulse(false), 1000);
      }
      prevItemsRef.current = totalItems;
    }
  }, [totalItems, mounted]);

  const isOnCatalog = pathname === "/catalog" || pathname.startsWith("/catalog");

  const haptic = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([6]);
    }
  }, []);

  const openAray = useCallback(() => {
    haptic();
    window.dispatchEvent(new CustomEvent("aray:open"));
  }, [haptic]);

  // Левые пункты
  const leftItems = [
    {
      id: "catalog",
      icon: LayoutGrid,
      label: "Каталог",
      href: "/catalog",
      action: null,
    },
    ...(isOnCatalog
      ? [{ id: "filters", icon: SlidersHorizontal, label: "Фильтры", href: null, action: () => toggleFilters() }]
      : [{ id: "search", icon: Search, label: "Поиск", href: null, action: () => toggleSearch() }]
    ),
  ];

  // Правые пункты
  const rightItems = [
    {
      id: "cart",
      icon: ShoppingCart,
      label: "Корзина",
      href: null,
      action: () => setCartOpen(true),
      badge: totalItems,
    },
    {
      id: "account",
      icon: User,
      label: "Кабинет",
      href: null,
      action: () => toggleAccount(),
    },
  ];

  const renderNavItem = (item: typeof leftItems[0] & { badge?: number }) => {
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
        <motion.div
          animate={
            isCart && cartBounce
              ? { scale: [1, 1.35, 0.9, 1.15, 1] }
              : isActive ? { scale: 1.1 } : { scale: 1 }
          }
          transition={
            isCart && cartBounce
              ? { duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1] }
              : { type: "spring", stiffness: 400, damping: 20 }
          }
          className={`relative ${hasCartItems && !isActive ? "text-brand-orange" : ""}`}
          {...(isCart ? { "data-cart-icon": true } : {})}
        >
          <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.3 : 1.7} />
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
      return <Link key={item.id} href={item.href} onClick={haptic}>{content}</Link>;
    }
    return (
      <button key={item.id} onClick={() => { haptic(); (item as any).action?.(); }}>
        {content}
      </button>
    );
  };

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
      {/* Блик сверху */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      <div className="flex items-end justify-around px-1 pt-1 pb-2.5 relative">

        {/* Левые пункты */}
        <div className="flex items-center justify-around flex-1 pt-1">
          {leftItems.map(renderNavItem)}
        </div>

        {/* ─── ARАЙ — центральная поднятая кнопка ─── */}
        <div className="flex flex-col items-center relative" style={{ marginTop: "-20px", minWidth: "72px" }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 16 }}
            onClick={openAray}
            aria-label="Открыть Арай"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {/* Внешнее дыхающее кольцо */}
            <span
              className={`absolute inset-0 rounded-2xl ${arayPulse ? "animate-ping" : ""}`}
              style={{
                background: "rgba(30, 120, 255, 0.25)",
                animationDuration: "0.8s",
              }}
            />

            {/* Основная кнопка */}
            <div
              className="aray-center-btn relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #0a1628 0%, #0d2550 40%, #0a3d7a 75%, #1055aa 100%)",
                border: "1px solid rgba(60, 140, 255, 0.35)",
              }}
            >
              {/* Вращающееся золотое кольцо */}
              <span
                className="absolute inset-0 rounded-2xl opacity-60"
                style={{
                  background: "conic-gradient(from 0deg, transparent 0%, rgba(255,200,50,0.35) 20%, transparent 40%, rgba(30,150,255,0.25) 60%, transparent 80%, rgba(255,200,50,0.15) 100%)",
                  animation: "spin 10s linear infinite",
                }}
              />

              {/* Аватар */}
              <div className="relative w-10 h-10 rounded-xl overflow-hidden z-10">
                <Image
                  src="/aray/aray-avatar.jpg"
                  alt="Арай"
                  fill
                  className="object-cover object-top"
                  sizes="40px"
                />
              </div>

              {/* Бейдж корзины */}
              {mounted && totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 z-20 text-white text-[9px] min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center font-bold leading-none"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 8px rgba(245,158,11,0.6)" }}
                >
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </div>
          </motion.button>

          {/* Подпись */}
          <span
            className="text-[9px] font-bold mt-1 tracking-wider"
            style={{ color: "rgba(100, 170, 255, 0.9)" }}
          >
            АРАЙ
          </span>

          <style jsx>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        {/* Правые пункты */}
        <div className="flex items-center justify-around flex-1 pt-1">
          {rightItems.map(renderNavItem)}
        </div>
      </div>
    </nav>
  );
}
