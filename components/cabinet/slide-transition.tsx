"use client";

/**
 * Slide-transition для кабинета.
 *
 * Каждый переход между /cabinet/* — лёгкий slide-from-right (16px → 0) + fade.
 * 180ms cubic-bezier. БЕЗ exit-анимации — чтобы не блокировать появление новой
 * страницы (если страница тяжёлая — старая исчезает мгновенно, новая появляется
 * с slide).
 *
 * willChange + GPU-friendly transform — не тормозит даже на слабых мобилках.
 */

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function CabinetSlideTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.18,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
