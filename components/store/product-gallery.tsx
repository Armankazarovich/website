"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  name: string;
  inStock?: boolean;
}

export function ProductGallery({ images, name, inStock }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  const prev = useCallback(() => setActive(i => Math.max(i - 1, 0)), []);
  const next = useCallback(() => setActive(i => Math.min(i + 1, images.length - 1)), [images.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (delta > 50) next();
    else if (delta < -50) prev();
  };

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative rounded-2xl overflow-hidden bg-muted border border-border select-none"
        style={{ aspectRatio: "var(--photo-aspect, 3/4)" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.length > 0 ? (
          <>
            <Image
              key={active}
              src={images[active]}
              alt={`${name} — фото ${active + 1}`}
              fill
              className="object-cover transition-opacity duration-200"
              priority={active === 0}
              unoptimized
            />

            {/* In stock badge */}
            {inStock && (
              <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                В наличии
              </span>
            )}

            {/* Counter badge */}
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
                {active + 1} / {images.length}
              </span>
            )}

            {/* Prev / Next arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  disabled={active === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center disabled:opacity-0 transition-all"
                  aria-label="Предыдущее фото"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  disabled={active === images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center disabled:opacity-0 transition-all"
                  aria-label="Следующее фото"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="w-16 h-16 opacity-30" />
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                i === active
                  ? "border-primary shadow-sm shadow-primary/30"
                  : "border-border opacity-60 hover:opacity-100 hover:border-primary/40"
              )}
              aria-label={`Фото ${i + 1}`}
            >
              <Image
                src={img}
                alt={`${name} — миниатюра ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators for mobile */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 sm:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full transition-all",
                i === active ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
