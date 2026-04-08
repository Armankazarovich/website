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
        {arayEnabled && <div className="flex flex-col items-center relative" style={{ marginTop: "-26px", minWidth: "76px" }}>
          <motion.button
            whileTap={{ scale: 0.84 }}
            transition={{ type: "spring", stiffness: 360, damping: 14 }}
            onClick={openAray}
            aria-label="Открыть Арай"
            style={{ WebkitTapHighlightColor: "transparent", position: "relative", display: "block" }}
          >
            {/* Ping при добавлении в корзину */}
            {arayPulse && (
              <span className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "rgba(232,112,10,0.30)", animationDuration: "0.65s" }} />
            )}

            {/* Платформа-тень */}
            <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2"
              style={{
                width: "52px", height: "12px",
                background: "radial-gradient(ellipse, rgba(160,50,0,0.50) 0%, transparent 70%)",
                filter: "blur(4px)",
              }}
            />

            {/* Внешнее дыхание — только CSS drop-shadow, без лишних div */}
            <div className="relative w-[64px] h-[64px] flex items-center justify-center"
              style={{ animation: "arayBreath 3s ease-in-out infinite" }}
            >
              <svg
                width="60" height="60" viewBox="0 0 100 100"
                className="relative z-10"
                style={{
                  overflow: "visible",
                  filter: "drop-shadow(0 0 8px rgba(232,112,10,0.70)) drop-shadow(0 2px 12px rgba(160,40,0,0.55))",
                }}
              >
                <defs>
                  {/* Основной 3D объём с живыми цветами */}
                  <radialGradient id="mob-base" cx="34%" cy="28%" r="70%">
                    <stop offset="0%"   stopColor="#fffbe0"/>
                    <stop offset="8%"   stopColor="#ffe080">
                      <animate attributeName="stopColor" values="#ffe080;#ffd040;#ffe080" dur="4s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="22%"  stopColor="#ffa020">
                      <animate attributeName="stopColor" values="#ffa020;#ff8800;#ffb030;#ffa020" dur="6s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="45%"  stopColor="#d06000"/>
                    <stop offset="68%"  stopColor="#7a2000"/>
                    <stop offset="88%"  stopColor="#360800"/>
                    <stop offset="100%" stopColor="#120200"/>
                  </radialGradient>

                  {/* Вращающийся внутренний жар */}
                  <radialGradient id="mob-hot" cx="50%" cy="24%" r="46%">
                    <stop offset="0%" stopColor="#ffe090" stopOpacity="0.75">
                      <animate attributeName="stopOpacity" values="0.75;1;0.50;0.75" dur="3s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" stopColor="#ffe090" stopOpacity="0"/>
                  </radialGradient>

                  {/* Тень */}
                  <radialGradient id="mob-dark" cx="72%" cy="74%" r="54%">
                    <stop offset="0%"   stopColor="#050000" stopOpacity="0.90"/>
                    <stop offset="55%"  stopColor="#150300" stopOpacity="0.40"/>
                    <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
                  </radialGradient>

                  {/* Главный зайчик */}
                  <radialGradient id="mob-hl" cx="30%" cy="24%" r="35%">
                    <stop offset="0%"   stopColor="white" stopOpacity="0.95"/>
                    <stop offset="28%"  stopColor="white" stopOpacity="0.50"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>

                  {/* Rim light */}
                  <radialGradient id="mob-rim" cx="50%" cy="50%" r="50%">
                    <stop offset="73%" stopColor="transparent" stopOpacity="0"/>
                    <stop offset="88%" stopColor="#ff9500"  stopOpacity="0.55"/>
                    <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.85"/>
                  </radialGradient>

                  <clipPath id="mob-clip"><circle cx="50" cy="50" r="46"/></clipPath>
                </defs>

                {/* Базовая сфера */}
                <circle cx="50" cy="50" r="46" fill="url(#mob-base)"/>

                {/* Живой внутренний жар */}
                <g clipPath="url(#mob-clip)">
                  <ellipse cx="50" cy="28" rx="36" ry="22" fill="url(#mob-hot)">
                    <animateTransform attributeName="transform" type="rotate"
                      from="0 50 50" to="360 50 50" dur="7s" repeatCount="indefinite"/>
                  </ellipse>
                  <ellipse cx="50" cy="72" rx="26" ry="14" fill="#fb923c" opacity="0.14">
                    <animateTransform attributeName="transform" type="rotate"
                      from="180 50 50" to="-180 50 50" dur="10s" repeatCount="indefinite"/>
                  </ellipse>
                </g>

                {/* Тень, rim, блик */}
                <circle cx="50" cy="50" r="46" fill="url(#mob-dark)"/>
                <circle cx="50" cy="50" r="46" fill="url(#mob-rim)"/>
                <circle cx="50" cy="50" r="46" fill="url(#mob-hl)"/>

                {/* Золотой контур */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,210,80,0.20)" strokeWidth="1.5"/>

                {/* Искра */}
                <ellipse cx="64" cy="35" rx="5" ry="3"
                  fill="white" fillOpacity="0.28" transform="rotate(-30 64 35)">
                  <animate attributeName="fillOpacity" values="0.28;0.48;0.18;0.28" dur="4s" repeatCount="indefinite"/>
                </ellipse>
              </svg>

              {/* Conic-блеск */}
              <div className="absolute rounded-full overflow-hidden pointer-events-none z-[11]"
                style={{
                  width: "60px", height: "60px",
                  animation: "orbLightSpin 8s linear infinite",
                  background: "conic-gradient(from 0deg at 31% 26%, rgba(255,248,160,0.28) 0deg, transparent 48deg, rgba(70,12,0,0.18) 168deg, transparent 248deg, rgba(255,160,40,0.16) 312deg, transparent 360deg)",
                }}
              />
            </div>
          </motion.button>

          {/* Подпись */}
          <span className="text-[9px] font-bold tracking-widest"
            style={{ color: "rgba(251,191,36,0.82)", marginTop: "0px", textShadow: "0 0 6px rgba(251,140,0,0.45)" }}>
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
