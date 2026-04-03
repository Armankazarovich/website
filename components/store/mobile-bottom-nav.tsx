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

      <div className="flex items-end justify-around px-1 pt-1 pb-2.5 relative">

        {/* Левые пункты */}
        <div className="flex items-center justify-around flex-1 pt-1">
          {leftItems.map(renderNavItem)}
        </div>

        {/* ─── ARАЙ — центральная поднятая кнопка ─── */}
        {arayEnabled && <div className="flex flex-col items-center relative" style={{ marginTop: "-20px", minWidth: "72px" }}>
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
                background: "rgba(232, 112, 10, 0.25)",
                animationDuration: "0.8s",
              }}
            />

            {/* Основная кнопка — SVG шар */}
            <div className="aray-center-btn relative w-14 h-14 rounded-2xl flex items-center justify-center">
              {/* SVG сфера */}
              <svg width="46" height="46" viewBox="0 0 100 100" className="relative z-10 drop-shadow-lg">
                <defs>
                  {/* Основной объём шара — глубокий оранжево-коричневый */}
                  <radialGradient id="navOrbG" cx="33%" cy="26%" r="75%">
                    <stop offset="0%"   stopColor="#fff8dc"/>
                    <stop offset="12%"  stopColor="#ffd166"/>
                    <stop offset="30%"  stopColor="#f4820a"/>
                    <stop offset="55%"  stopColor="#c44b00"/>
                    <stop offset="78%"  stopColor="#7a1c00"/>
                    <stop offset="100%" stopColor="#2d0800"/>
                  </radialGradient>
                  {/* Тень тёмной стороны */}
                  <radialGradient id="navOrbShadow" cx="74%" cy="76%" r="58%">
                    <stop offset="0%"   stopColor="#0d0000" stopOpacity="0.75"/>
                    <stop offset="60%"  stopColor="#200500" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#0d0000" stopOpacity="0"/>
                  </radialGradient>
                  {/* Яркий блик — главный световой зайчик */}
                  <radialGradient id="navOrbHL" cx="28%" cy="20%" r="36%">
                    <stop offset="0%"   stopColor="white" stopOpacity="0.98"/>
                    <stop offset="40%"  stopColor="white" stopOpacity="0.45"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>
                  {/* Ободок — rim light снизу-справа */}
                  <radialGradient id="navOrbRim" cx="50%" cy="50%" r="50%">
                    <stop offset="72%"  stopColor="transparent"  stopOpacity="0"/>
                    <stop offset="88%"  stopColor="#ff8c00"       stopOpacity="0.45"/>
                    <stop offset="100%" stopColor="#ffb830"       stopOpacity="0.65"/>
                  </radialGradient>
                </defs>
                {/* Слои шара */}
                <circle cx="50" cy="50" r="46" fill="url(#navOrbG)"/>
                <circle cx="50" cy="50" r="46" fill="url(#navOrbShadow)"/>
                <circle cx="50" cy="50" r="46" fill="url(#navOrbRim)"/>
                <circle cx="50" cy="50" r="46" fill="url(#navOrbHL)"/>
                {/* Тонкий контур */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,200,60,0.18)" strokeWidth="1.5"/>
              </svg>

              {/* Вращающийся световой эффект поверх шара */}
              <div
                className="absolute rounded-full overflow-hidden pointer-events-none z-[11]"
                style={{
                  width: "46px",
                  height: "46px",
                  animation: "orbLightSpin 6s linear infinite",
                  background: "conic-gradient(from 0deg at 32% 28%, rgba(255,240,160,0.22) 0deg, transparent 70deg, rgba(120,30,0,0.18) 180deg, transparent 260deg, rgba(255,180,60,0.14) 320deg, transparent 360deg)",
                  borderRadius: "50%",
                }}
              />

              {/* Бейдж корзины */}
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 z-20 text-white text-[9px] min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center font-bold leading-none"
                  style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)", boxShadow: "0 0 8px rgba(232,112,10,0.7)" }}>
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </div>
          </motion.button>

          {/* Подпись */}
          <span className="text-[9px] font-bold mt-1 tracking-wider" style={{ color: "rgba(245,158,11,0.75)" }}>
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
