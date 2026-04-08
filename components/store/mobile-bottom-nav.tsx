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
        {arayEnabled && <div className="flex flex-col items-center relative" style={{ marginTop: "-24px", minWidth: "76px" }}>
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 380, damping: 14 }}
            onClick={openAray}
            aria-label="Открыть Арай"
            style={{ WebkitTapHighlightColor: "transparent", position: "relative" }}
          >
            {/* Ping при добавлении в корзину */}
            {arayPulse && (
              <span className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "rgba(232,112,10,0.30)", animationDuration: "0.7s" }} />
            )}

            {/* Платформа-тень под шаром */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1"
              style={{
                width: "46px", height: "10px",
                background: "radial-gradient(ellipse, rgba(180,60,0,0.45) 0%, transparent 72%)",
                filter: "blur(3px)",
              }}
            />

            {/* Основная кнопка */}
            <div className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center">

              {/* Внешнее кольцо-ореол */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(255,140,0,0.18) 0%, transparent 70%)",
                  animation: "arayBreath 3s ease-in-out infinite",
                }}
              />

              {/* SVG шар — улучшенный */}
              <svg width="52" height="52" viewBox="0 0 100 100" className="relative z-10 drop-shadow-lg">
                <defs>
                  {/* Основной объём — насыщенный 3D */}
                  <radialGradient id="orbMain" cx="34%" cy="27%" r="70%">
                    <stop offset="0%"   stopColor="#fffbea"/>
                    <stop offset="8%"   stopColor="#ffe082"/>
                    <stop offset="22%"  stopColor="#ffac30"/>
                    <stop offset="40%"  stopColor="#e8700a"/>
                    <stop offset="60%"  stopColor="#b84500"/>
                    <stop offset="80%"  stopColor="#6b1800"/>
                    <stop offset="100%" stopColor="#1e0500"/>
                  </radialGradient>
                  {/* Тень правого-нижнего квадранта */}
                  <radialGradient id="orbDark" cx="72%" cy="75%" r="55%">
                    <stop offset="0%"   stopColor="#0a0000" stopOpacity="0.80"/>
                    <stop offset="55%"  stopColor="#1a0400" stopOpacity="0.38"/>
                    <stop offset="100%" stopColor="#0a0000" stopOpacity="0"/>
                  </radialGradient>
                  {/* Главный зайчик */}
                  <radialGradient id="orbHL1" cx="30%" cy="22%" r="30%">
                    <stop offset="0%"   stopColor="white" stopOpacity="1"/>
                    <stop offset="35%"  stopColor="white" stopOpacity="0.55"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>
                  {/* Вторичный мягкий блик внизу-слева */}
                  <radialGradient id="orbHL2" cx="22%" cy="75%" r="28%">
                    <stop offset="0%"   stopColor="#ffcc66" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#ffcc66" stopOpacity="0"/>
                  </radialGradient>
                  {/* Rim light — золотой контур снизу-справа */}
                  <radialGradient id="orbRim" cx="50%" cy="50%" r="50%">
                    <stop offset="74%" stopColor="transparent" stopOpacity="0"/>
                    <stop offset="88%" stopColor="#ff9500"     stopOpacity="0.55"/>
                    <stop offset="100%" stopColor="#ffcc00"    stopOpacity="0.80"/>
                  </radialGradient>
                  {/* Внешний мягкий ореол */}
                  <filter id="orbGlow">
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                </defs>
                {/* Слои шара */}
                <circle cx="50" cy="50" r="46" fill="url(#orbMain)" filter="url(#orbGlow)"/>
                <circle cx="50" cy="50" r="46" fill="url(#orbDark)"/>
                <circle cx="50" cy="50" r="46" fill="url(#orbRim)"/>
                <circle cx="50" cy="50" r="46" fill="url(#orbHL1)"/>
                <circle cx="50" cy="50" r="46" fill="url(#orbHL2)"/>
                {/* Тонкий золотой контур */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,210,80,0.22)" strokeWidth="1.5"/>
                {/* Маленький вторичный зайчик — искра */}
                <ellipse cx="64" cy="36" rx="5" ry="3.5"
                  fill="white" fillOpacity="0.25"
                  transform="rotate(-30 64 36)"/>
              </svg>

              {/* Вращающийся conic-градиент поверх — блеск */}
              <div className="absolute rounded-full overflow-hidden pointer-events-none z-[11]"
                style={{
                  width: "52px", height: "52px",
                  animation: "orbLightSpin 8s linear infinite",
                  background: "conic-gradient(from 0deg at 32% 26%, rgba(255,245,160,0.28) 0deg, transparent 55deg, rgba(100,20,0,0.20) 175deg, transparent 255deg, rgba(255,170,50,0.18) 315deg, transparent 360deg)",
                }}
              />

            </div>
          </motion.button>

          {/* Подпись */}
          <span className="text-[9px] font-bold tracking-wider" style={{ color: "rgba(245,158,11,0.80)", marginTop: "2px" }}>
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
