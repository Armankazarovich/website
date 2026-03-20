"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string; // если нет href — это текущая страница
}

export function BreadcrumbScroll({ items }: { items: BreadcrumbItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  // Авто-скролл к правому краю — текущая страница всегда видна
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Небольшая задержка чтобы DOM успел отрисоваться
    const t = setTimeout(() => {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={ref}
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none mb-6"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {/* Разделитель (не перед первым) */}
          {i > 0 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          )}

          {item.href ? (
            /* Обычный элемент — ссылка */
            <Link
              href={item.href}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-border/60 bg-muted/50 backdrop-blur-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-150 whitespace-nowrap shrink-0"
            >
              {item.label}
            </Link>
          ) : (
            /* Текущая страница — оранжевый акцент */
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-primary/30 bg-primary/8 text-primary backdrop-blur-sm whitespace-nowrap shrink-0">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
