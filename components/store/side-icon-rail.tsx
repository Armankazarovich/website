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
import { LayoutGrid, Search, ShoppingCart, Heart, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cart";
import { useAccountDrawer } from "@/store/account-drawer";
import { useSearchDrawer } from "@/store/search-drawer";
import { useWishlistStore } from "@/store/wishlist";

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
}

function RailIcon({ label, icon, onClick, href, badge }: RailIconProps) {
  const base =
    "relative w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 active:scale-95 transition-all duration-150";

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
  const totalItems = useCartStore((s) => s.items.length);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const wishCount = useWishlistStore((s) => s.items.length);
  const { toggle: toggleAccount } = useAccountDrawer();
  const { toggle: toggleSearch } = useSearchDrawer();

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
          className="fixed right-3 top-1/2 -translate-y-1/2 z-[60] hidden sm:flex lg:hidden flex-col gap-2"
          aria-label="Быстрая навигация"
        >
          <RailIcon
            label="Каталог"
            icon={<LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            href="/catalog"
          />
          <RailIcon
            label="Поиск"
            icon={<Search className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            onClick={toggleSearch}
          />
          <RailIcon
            label="Корзина"
            icon={<ShoppingCart className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            onClick={() => setCartOpen(true)}
            badge={totalItems}
          />
          <RailIcon
            label="Избранное"
            icon={<Heart className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            href="/wishlist"
            badge={wishCount}
          />
          <RailIcon
            label="Аккаунт"
            icon={<User className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            onClick={toggleAccount}
          />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
