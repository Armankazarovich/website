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
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAccountDrawer } from "@/store/account-drawer";
import { useSearchDrawer } from "@/store/search-drawer";

export function MobileBottomNav({ arayEnabled = true }: { arayEnabled?: boolean }) {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const totalPrice = useCartStore((s) => s.totalPrice());
  const { setCartOpen } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [arayPulse, setArayPulse] = useState(false);
  const prevItemsRef = useRef(0);
  const { toggle: toggleAccount } = useAccountDrawer();
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
    { id: "search", icon: Search, label: "Поиск", href: null, action: () => toggleSearch() },
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

      <div className="flex items-end justify-around px-1 pt-1 relative" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))" }}>

        {/* Левые пункты */}
        <div className="flex items-center justify-around flex-1 pt-1">
          {leftItems.map(renderNavItem)}
        </div>

        {/* ─── АРАЙ — центральная поднятая кнопка ─── */}
        {arayEnabled && <div className="flex flex-col items-center" style={{ marginTop: "-18px", minWidth: "72px" }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={openAray}
            aria-label="Открыть Арай"
            style={{ WebkitTapHighlightColor: "transparent", position: "relative", display: "block" }}
          >
            {/* Ping при добавлении в корзину */}
            {arayPulse && (
              <span className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "rgba(232,112,10,0.25)", animationDuration: "0.7s" }} />
            )}

            {/* Шар */}
            <svg
              width="52" height="52" viewBox="0 0 100 100"
              style={{
                display: "block",
                filter: "drop-shadow(0 2px 8px rgba(200,80,0,0.45)) drop-shadow(0 0 4px rgba(232,112,10,0.30))",
              }}
            >
              <defs>
                <radialGradient id="mob-base" cx="34%" cy="28%" r="70%">
                  <stop offset="0%"   stopColor="#fffbe0"/>
                  <stop offset="10%"  stopColor="#ffca40"/>
                  <stop offset="28%"  stopColor="#f07800"/>
                  <stop offset="52%"  stopColor="#c05000"/>
                  <stop offset="75%"  stopColor="#6e1c00"/>
                  <stop offset="100%" stopColor="#160300"/>
                </radialGradient>

                <radialGradient id="mob-hl" cx="30%" cy="25%" r="34%">
                  <stop offset="0%"   stopColor="white" stopOpacity="0.90"/>
                  <stop offset="40%"  stopColor="white" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="white" stopOpacity="0"/>
                </radialGradient>

                <radialGradient id="mob-dark" cx="72%" cy="74%" r="52%">
                  <stop offset="0%"   stopColor="#050000" stopOpacity="0.82"/>
                  <stop offset="60%"  stopColor="#100200" stopOpacity="0.32"/>
                  <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
                </radialGradient>

                <radialGradient id="mob-rim" cx="50%" cy="50%" r="50%">
                  <stop offset="76%" stopColor="transparent" stopOpacity="0"/>
                  <stop offset="90%" stopColor="#ff9500"  stopOpacity="0.45"/>
                  <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.70"/>
                </radialGradient>
              </defs>

              <circle cx="50" cy="50" r="46" fill="url(#mob-base)"/>
              <circle cx="50" cy="50" r="46" fill="url(#mob-dark)"/>
              <circle cx="50" cy="50" r="46" fill="url(#mob-rim)"/>
              <circle cx="50" cy="50" r="46" fill="url(#mob-hl)"/>
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,200,60,0.18)" strokeWidth="1"/>
              {/* Искра */}
              <ellipse cx="63" cy="35" rx="4.5" ry="2.8"
                fill="white" fillOpacity="0.22" transform="rotate(-28 63 35)"/>
            </svg>
          </motion.button>

          {/* Подпись */}
          <span className="text-[9px] font-semibold tracking-wider mt-0.5"
            style={{ color: "rgba(251,163,30,0.75)" }}>
            АРАЙ
          </span>
        </div>}

        {/* Правые пункты */}
        <div className="flex items-center justify-around flex-1 pt-1">
          {rightItems.map(renderNavItem)}
        </div>
      </div>
    </nav>
  );
}
