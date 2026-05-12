"use client";

/**
 * MobileBottomNav — единое нижнее меню магазина для мобилки (calm UI).
 *
 * Структура (5 пунктов): Каталог · Поиск · АРАЙ (центр, приподнят) · Корзина · Аккаунт
 * Стиль: DESIGN_SYSTEM.md — bg-card border-t border-border, без backdrop-blur, без arayglass.
 *
 * ARAY в центре:
 *  - Tap / long-press   → "aray:open" (открывает единый чат)
 *  - Голос живет внутри общего ARAY-ввода, без legacy fullscreen overlay.
 *  - Бейдж количества   → подсвечивается при добавлении в корзину
 *
 * Скрывается когда клавиатура открыта (visualViewport API).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ShoppingCart, Search, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAccountDrawer } from "@/store/account-drawer";
import { useSearchDrawer } from "@/store/search-drawer";
import { ArayOrb } from "@/components/shared/aray-orb";
import { requestArayOpen } from "@/components/store/aray-events";

function haptic(pattern: number | number[] = 6) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badge?: number;
  customLabel?: string; // например, totalPrice вместо "Корзина"
  onClick?: () => void;
  href?: string;
}

function NavItem({
  icon: Icon,
  label,
  isActive,
  badge,
  customLabel,
  onClick,
  href,
}: NavItemProps) {
  const content = (
    <motion.div
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={`relative flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative">
        <Icon
          className="w-[22px] h-[22px]"
          strokeWidth={isActive ? 2.2 : 1.75}
        />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center font-semibold leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span
        className={`block max-w-[52px] truncate text-[10px] leading-none tabular-nums ${isActive ? "font-semibold" : "font-medium"}`}
      >
        {customLabel ?? label}
      </span>
    </motion.div>
  );

  const tapHandler = () => {
    haptic();
    onClick?.();
  };

  if (href) {
    return (
      <Link href={href} onClick={tapHandler} aria-label={label}>
        {content}
      </Link>
    );
  }
  return (
    <button onClick={tapHandler} aria-label={label} type="button">
      {content}
    </button>
  );
}

export function MobileBottomNav({
  arayEnabled = true,
}: {
  arayEnabled?: boolean;
}) {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const totalPrice = useCartStore((s) => s.totalPrice());
  const cartOpen = useCartStore((s) => s.cartOpen);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const accountOpen = useAccountDrawer((s) => s.open);
  const toggleAccount = useAccountDrawer((s) => s.toggle);
  const searchOpen = useSearchDrawer((s) => s.open);
  const toggleSearch = useSearchDrawer((s) => s.toggle);

  const [mounted, setMounted] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [arayPulse, setArayPulse] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const [globalOverlayOpen, setGlobalOverlayOpen] = useState(false);
  const prevItemsRef = useRef(0);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => {
      setGlobalOverlayOpen(document.body.dataset.adminOverlayOpen === "true");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-admin-overlay-open"],
    });
    return () => observer.disconnect();
  }, []);

  // Скрываем при открытой клавиатуре
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => setKbOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Bounce корзины + Арай pulse при добавлении товара
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

  // ARAY: tap/long-press = unified chat. Voice is handled by the chat input.
  const onArayPointerDown = useCallback(() => {
    longPressTriggered.current = false;
    longPressRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      haptic([12, 40, 12]);
      requestArayOpen("open");
    }, 400);
  }, []);

  const onArayPointerUp = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const onArayClick = useCallback(() => {
    if (longPressTriggered.current) return;
    haptic(8);
    requestArayOpen("open");
  }, []);

  // Cleanup
  useEffect(
    () => () => {
      if (longPressRef.current) clearTimeout(longPressRef.current);
    },
    [],
  );

  const normalizeHref = (value: string) => {
    const clean = value.split("?")[0].replace(/\/$/, "");
    return clean || "/";
  };
  const isActive = (path: string) => {
    const current = normalizeHref(pathname);
    const target = normalizeHref(path);
    if (target === "/") return current === target;
    return current === target || current.startsWith(`${target}/`);
  };
  const hiddenByOverlay = kbOpen || cartOpen || accountOpen || searchOpen || globalOverlayOpen;

  return (
    <nav
      data-store-mobile-dock
      className="fixed left-0 right-0 z-50 sm:hidden transition-all duration-300"
      style={{
        bottom: hiddenByOverlay ? "-120px" : "0",
        opacity: hiddenByOverlay ? 0 : 1,
        pointerEvents: hiddenByOverlay ? "none" : "auto",
        // Liquid Glass — единый стиль с Header магазина (но легче: blur 20px вместо 32px)
        background: "hsl(var(--background) / 0.96)",
        borderTop: "1px solid hsl(var(--primary) / 0.12)",
        boxShadow: "0 -4px 20px hsl(var(--foreground) / 0.06)",
      }}
      aria-label="Нижняя навигация"
    >
      {/* Palette glow line — тонкая primary полоса сверху, как в Header снизу */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.4) 30%, hsl(var(--primary)/0.6) 50%, hsl(var(--primary)/0.4) 70%, transparent 100%)",
        }}
      />

      <div
        className="flex items-end justify-around px-1 pt-1 relative"
        style={{
          paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))",
        }}
      >
        {/* Левые: Каталог + Поиск */}
        <div className="flex items-center justify-around flex-1 pt-1">
          <NavItem
            icon={LayoutGrid}
            label="Каталог"
            href="/catalog"
            isActive={isActive("/catalog")}
          />
          <NavItem
            icon={Search}
            label="Поиск"
            onClick={() => toggleSearch()}
            isActive={searchOpen}
          />
        </div>

        {/* Центр: Арай (приподнят на -18px) */}
        {arayEnabled && (
          <div
            className="flex flex-col items-center"
            style={{ marginTop: "-18px", minWidth: "72px" }}
          >
            <button
              type="button"
              onClick={onArayClick}
              onPointerDown={onArayPointerDown}
              onPointerUp={onArayPointerUp}
              onPointerCancel={onArayPointerUp}
              aria-label="ARAY — открыть чат"
              className={`flex flex-col items-center transition-transform duration-150 active:scale-[0.92] focus:outline-none ${
                cartBounce ? "animate-cart-bounce" : ""
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <ArayOrb
                size={52}
                id="mob-nav"
                pulse={arayPulse ? "listening" : "idle"}
                badgeCount={totalItems > 0 ? totalItems : undefined}
              />
              <span className="text-[10px] font-semibold mt-0.5 text-muted-foreground tracking-wide">
                Арай
              </span>
            </button>
          </div>
        )}

        {/* Правые: Корзина + Аккаунт */}
        <div className="flex items-center justify-around flex-1 pt-1">
          <NavItem
            icon={ShoppingCart}
            label="Корзина"
            onClick={() => setCartOpen(true)}
            isActive={
              cartOpen || pathname === "/cart" || pathname === "/checkout"
            }
            badge={mounted ? totalItems : undefined}
            customLabel={
              mounted && totalItems > 0 ? formatPrice(totalPrice) : undefined
            }
          />
          <NavItem
            icon={User}
            label="Кабинет"
            onClick={() => toggleAccount()}
            isActive={
              accountOpen ||
              pathname.startsWith("/cabinet")
            }
          />
        </div>
      </div>
    </nav>
  );
}
