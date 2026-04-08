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
        {arayEnabled && <div className="flex flex-col items-center relative" style={{ marginTop: "-28px", minWidth: "80px" }}>
          <motion.button
            whileTap={{ scale: 0.82 }}
            transition={{ type: "spring", stiffness: 340, damping: 12 }}
            onClick={openAray}
            aria-label="Открыть Арай"
            style={{ WebkitTapHighlightColor: "transparent", position: "relative" }}
          >
            {/* Ping при добавлении в корзину */}
            {arayPulse && (
              <span className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "rgba(232,112,10,0.35)", animationDuration: "0.65s" }} />
            )}

            {/* Широкое свечение вокруг шара */}
            <div className="absolute rounded-full pointer-events-none"
              style={{
                inset: "-10px",
                background: "radial-gradient(circle, rgba(255,130,0,0.22) 0%, rgba(255,80,0,0.10) 45%, transparent 72%)",
                animation: "arayBreath 2.8s ease-in-out infinite",
              }}
            />

            {/* Платформа-тень под шаром */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2"
              style={{
                width: "56px", height: "14px",
                background: "radial-gradient(ellipse, rgba(180,60,0,0.55) 0%, rgba(100,20,0,0.20) 50%, transparent 75%)",
                filter: "blur(4px)",
              }}
            />

            {/* Основная кнопка */}
            <div className="relative w-[66px] h-[66px] rounded-full flex items-center justify-center">

              {/* SVG шар — живой, с анимациями */}
              <svg width="62" height="62" viewBox="0 0 100 100" className="relative z-10" style={{ overflow: "visible" }}>
                <defs>
                  {/* Оранжевый ореол-фильтр */}
                  <filter id="mob-glow" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
                    <feColorMatrix in="blur" type="matrix"
                      values="2.2 0.8 0 0 0  0.5 0.15 0 0 0  0 0 0 0 0  0 0 0 0.85 0"
                      result="glow"/>
                    <feMerge>
                      <feMergeNode in="glow"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>

                  {/* Основной объём — насыщенный 3D с живыми цветами */}
                  <radialGradient id="mob-base" cx="36%" cy="30%" r="72%">
                    <stop offset="0%"   stopColor="#fff8d0"/>
                    <stop offset="10%"  stopColor="#fbbf24">
                      <animate attributeName="stopColor"
                        values="#fbbf24;#f97316;#fde047;#fbbf24"
                        dur="5s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="28%"  stopColor="#f07800">
                      <animate attributeName="stopColor"
                        values="#f07800;#e8700a;#ff9500;#f07800"
                        dur="7s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="50%"  stopColor="#c85000"/>
                    <stop offset="72%"  stopColor="#7a2000"/>
                    <stop offset="88%"  stopColor="#3a0800"/>
                    <stop offset="100%" stopColor="#140300"/>
                  </radialGradient>

                  {/* Вращающийся внутренний жар */}
                  <radialGradient id="mob-hot" cx="50%" cy="22%" r="50%">
                    <stop offset="0%" stopColor="#fde68a" stopOpacity="0.80">
                      <animate attributeName="stopOpacity"
                        values="0.80;1;0.55;0.80" dur="3s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" stopColor="#fde68a" stopOpacity="0"/>
                  </radialGradient>

                  {/* Тень правого-нижнего квадранта */}
                  <radialGradient id="mob-dark" cx="74%" cy="76%" r="56%">
                    <stop offset="0%"   stopColor="#060000" stopOpacity="0.88"/>
                    <stop offset="50%"  stopColor="#180400" stopOpacity="0.42"/>
                    <stop offset="100%" stopColor="#060000" stopOpacity="0"/>
                  </radialGradient>

                  {/* Главный зайчик */}
                  <radialGradient id="mob-hl" cx="29%" cy="23%" r="38%">
                    <stop offset="0%"   stopColor="white" stopOpacity="0.92"/>
                    <stop offset="30%"  stopColor="white" stopOpacity="0.52"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>

                  {/* Rim light — золотой контур */}
                  <radialGradient id="mob-rim" cx="50%" cy="50%" r="50%">
                    <stop offset="72%" stopColor="transparent" stopOpacity="0"/>
                    <stop offset="87%" stopColor="#ff9500"  stopOpacity="0.60"/>
                    <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.90"/>
                  </radialGradient>

                  {/* Клип для внутренних анимаций */}
                  <clipPath id="mob-clip">
                    <circle cx="50" cy="50" r="46"/>
                  </clipPath>
                </defs>

                {/* Базовая сфера с оранжевым свечением */}
                <circle cx="50" cy="50" r="46" fill="url(#mob-base)" filter="url(#mob-glow)"/>

                {/* Вращающийся внутренний жар */}
                <g clipPath="url(#mob-clip)">
                  <ellipse cx="50" cy="28" rx="38" ry="24" fill="url(#mob-hot)">
                    <animateTransform attributeName="transform" type="rotate"
                      from="0 50 50" to="360 50 50" dur="6s" repeatCount="indefinite"/>
                  </ellipse>
                  <ellipse cx="50" cy="74" rx="28" ry="16" fill="#fb923c" opacity="0.15">
                    <animateTransform attributeName="transform" type="rotate"
                      from="180 50 50" to="-180 50 50" dur="9s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.15;0.25;0.08;0.15" dur="4.5s" repeatCount="indefinite"/>
                  </ellipse>
                </g>

                {/* Тень */}
                <circle cx="50" cy="50" r="46" fill="url(#mob-dark)"/>
                {/* Rim light */}
                <circle cx="50" cy="50" r="46" fill="url(#mob-rim)"/>
                {/* Главный блик */}
                <circle cx="50" cy="50" r="46" fill="url(#mob-hl)"/>
                {/* Тонкий золотой контур */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,210,80,0.28)" strokeWidth="1.5"/>
                {/* Вторичный зайчик — искра */}
                <ellipse cx="65" cy="35" rx="5.5" ry="3.5"
                  fill="white" fillOpacity="0.30"
                  transform="rotate(-32 65 35)">
                  <animate attributeName="fillOpacity" values="0.30;0.50;0.20;0.30" dur="3.5s" repeatCount="indefinite"/>
                </ellipse>
              </svg>

              {/* Вращающийся conic-градиент поверх — блеск */}
              <div className="absolute rounded-full overflow-hidden pointer-events-none z-[11]"
                style={{
                  width: "62px", height: "62px",
                  animation: "orbLightSpin 7s linear infinite",
                  background: "conic-gradient(from 0deg at 30% 25%, rgba(255,248,160,0.32) 0deg, transparent 50deg, rgba(80,15,0,0.22) 170deg, transparent 250deg, rgba(255,165,40,0.20) 310deg, transparent 360deg)",
                }}
              />
            </div>
          </motion.button>

          {/* Подпись */}
          <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(251,191,36,0.85)", marginTop: "1px", textShadow: "0 0 8px rgba(251,140,0,0.50)" }}>
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
