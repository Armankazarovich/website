"use client";

/**
 * SideIconRail — плавающая колонка иконок навигации справа.
 *
 * ВАЖНО: показывается ТОЛЬКО на планшете (640px - 1023px).
 *  - На мобилке (<640px) — нет, там используется MobileBottomNav снизу.
 *  - На десктопе (≥1024px) — нет, там полное header-меню.
 *
 * Иконки: Каталог, Поиск, Корзина, Избранное, Аккаунт
 * Стиль: calm UI (DESIGN_SYSTEM.md) — bg-card border-border rounded-full, без arayglass.
 * Прячется когда клавиатура открыта (visualViewport API).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompareArrows, LayoutGrid, Search, ShoppingCart, Heart, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cart";
import { useAccountDrawer } from "@/store/account-drawer";
import { useSearchDrawer } from "@/store/search-drawer";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(6); } catch {}
  }
}

interface RailIconProps {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  badge?: number;
  active?: boolean;
  compareTarget?: boolean;
}

function RailIcon({ label, icon, onClick, href, badge, active = false, compareTarget = false }: RailIconProps) {
  const base =
    `relative w-11 h-11 rounded-full bg-card border flex items-center justify-center active:scale-95 transition-all duration-150 ${
      active
        ? "border-primary/45 text-primary shadow-sm shadow-primary/10"
        : "border-border text-muted-foreground hover:text-primary hover:border-primary/40"
    }`;

  const handleClick = () => { haptic(); onClick?.(); };

  const content = (
    <>
      <span className="flex items-center justify-center">{icon}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full inline-flex items-center justify-center text-[9px] font-semibold text-primary-foreground bg-primary">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        title={label}
        onClick={handleClick}
        data-compare-icon={compareTarget ? true : undefined}
        className={base}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={handleClick}
      className={base}
    >
      {content}
    </button>
  );
}

export function SideIconRail() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.items.length);
  const cartOpen = useCartStore((s) => s.cartOpen);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const wishCount = useWishlistStore((s) => s.items.length);
  const compareCount = useCompareStore((s) => s.items.length);
  const accountOpen = useAccountDrawer((s) => s.open);
  const toggleAccount = useAccountDrawer((s) => s.toggle);
  const searchOpen = useSearchDrawer((s) => s.open);
  const toggleSearch = useSearchDrawer((s) => s.toggle);

  const [mounted, setMounted] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => setKbOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {!kbOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="store-side-icon-rail fixed right-3 top-1/2 -translate-y-1/2 z-[60] hidden sm:flex lg:hidden flex-col gap-2"
          aria-label="Быстрая навигация"
        >
          <RailIcon
            label="Каталог"
            icon={<LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            href="/catalog"
            active={pathname.startsWith("/catalog")}
          />
          <RailIcon
            label="Поиск"
            icon={<Search className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            onClick={toggleSearch}
            active={searchOpen}
          />
          <RailIcon
            label="Корзина"
            icon={<ShoppingCart className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            onClick={() => setCartOpen(true)}
            badge={totalItems}
            active={cartOpen || pathname === "/cart" || pathname === "/checkout"}
          />
          <RailIcon
            label="Избранное"
            icon={<Heart className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            href="/wishlist"
            badge={wishCount}
            active={pathname === "/wishlist"}
          />
          <RailIcon
            label="Сравнение"
            icon={<GitCompareArrows className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            href="/compare"
            badge={compareCount}
            active={pathname === "/compare"}
            compareTarget
          />
          <RailIcon
            label="Аккаунт"
            icon={<User className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            onClick={toggleAccount}
            active={accountOpen || pathname.startsWith("/cabinet")}
          />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
