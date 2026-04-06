"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  name: string;
  inStock?: boolean;
}

export function ProductGallery({ images, name, inStock }: ProductGalleryProps) {
  const [active, setActive]     = useState(0);
  const [dir, setDir]           = useState<"left" | "right" | null>(null);
  const [animating, setAnimating] = useState(false);
  const prevActiveRef = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const go = useCallback((idx: number) => {
    if (animating || idx === active || idx < 0 || idx >= images.length) return;
    prevActiveRef.current = active;
    setDir(idx > active ? "left" : "right");
    setAnimating(true);
    setActive(idx);
    setTimeout(() => {
      setDir(null);
      setAnimating(false);
    }, 280);
  }, [active, animating, images.length]);

  const prev = useCallback(() => go(active - 1), [go, active]);
  const next = useCallback(() => go(active + 1), [go, active]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (dy > 40) return; // вертикальный скролл — не трогаем
    if (dx > 45) next();
    else if (dx < -45) prev();
  };

  // Slide animation classes
  const slideIn  = dir === "left"  ? "translate-x-full"  : dir === "right" ? "-translate-x-full" : "";
  const slideOut = dir === "left"  ? "-translate-x-full" : dir === "right" ? "translate-x-full"  : "";

  return (
    <div className="space-y-3">

      {/* ── Главное фото ── */}
      <div
        className="relative rounded-2xl overflow-hidden bg-muted border border-border select-none"
        style={{ aspectRatio: "var(--photo-aspect, 3/4)" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.length > 0 ? (
          <>
            {/* Уходящее фото */}
            {animating && (
              <div
                className={cn(
                  "absolute inset-0 transition-transform duration-[280ms] ease-in-out",
                  slideOut
                )}
              >
                <Image
                  src={images[prevActiveRef.current]}
                  alt={name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Приходящее / текущее фото */}
            <div
              className={cn(
                "absolute inset-0 transition-transform duration-[280ms] ease-in-out",
                animating ? slideIn : "translate-x-0"
              )}
              style={{ transitionProperty: "transform" }}
            >
              <Image
                src={images[active]}
                alt={`${name} — фото ${active + 1}`}
                fill
                className="object-cover"
                priority={active === 0}
                unoptimized
              />
            </div>

            {/* В наличии */}
            {inStock && (
              <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                В наличии
              </span>
            )}

            {/* Счётчик */}
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 z-10 bg-black/50 text-white text-xs px-2.5 py-1 rounded-xl backdrop-blur-sm font-medium tabular-nums">
                {active + 1} / {images.length}
              </span>
            )}

            {/* Стрелки (только десктоп) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  disabled={active === 0}
                  className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-xl bg-black/40 hover:bg-black/65 backdrop-blur-sm text-white items-center justify-center disabled:opacity-0 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  disabled={active === images.length - 1}
                  className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-xl bg-black/40 hover:bg-black/65 backdrop-blur-sm text-white items-center justify-center disabled:opacity-0 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Зоны свайпа — визуальная подсказка (только мобильный) */}
            {images.length > 1 && (
              <>
                <div className="sm:hidden absolute left-0 top-0 w-1/4 h-full z-[5]" onClick={prev} />
                <div className="sm:hidden absolute right-0 top-0 w-1/4 h-full z-[5]" onClick={next} />
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="w-16 h-16 opacity-30" />
          </div>
        )}
      </div>

      {/* ── Точки (мобильный) ── */}
      {images.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 sm:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={cn(
                "rounded-full transition-all duration-200",
                i === active
                  ? "w-5 h-1.5 bg-primary"
                  : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            />
          ))}
        </div>
      )}

      {/* ── Миниатюры (десктоп) ── */}
      {images.length > 1 && (
        <div className="hidden sm:flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={cn(
                "relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                i === active
                  ? "border-primary shadow-sm shadow-primary/30 scale-105"
                  : "border-border opacity-55 hover:opacity-100 hover:border-primary/40 hover:scale-105"
              )}
            >
              <Image src={img} alt={`${name} ${i + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
