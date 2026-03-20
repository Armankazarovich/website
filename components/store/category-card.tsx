"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const CATEGORY_STYLES: Record<string, { gradient: string; emoji: string }> = {
  "sosna-el":     { gradient: "from-amber-800 via-amber-700 to-yellow-600",  emoji: "🌲" },
  "listvennitsa": { gradient: "from-red-900 via-rose-800 to-amber-700",       emoji: "🍂" },
  "kedr":         { gradient: "from-amber-900 via-amber-800 to-yellow-700",   emoji: "🌿" },
  "fanera":       { gradient: "from-stone-700 via-stone-600 to-amber-600",    emoji: "🪵" },
  "dsp-mdf-osb":  { gradient: "from-slate-700 via-slate-600 to-zinc-500",    emoji: "📋" },
  "lipa-osina":   { gradient: "from-lime-800 via-emerald-700 to-green-600",   emoji: "🌳" },
};
const DEFAULT_STYLE = { gradient: "from-amber-900 via-amber-800 to-brand-brown", emoji: "🪵" };

interface CategoryCardProps {
  slug: string;
  name: string;
  image?: string | null;
  productCount: number;
}

export function CategoryCard({ slug, name, image, productCount }: CategoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const style = CATEGORY_STYLES[slug] ?? DEFAULT_STYLE;
  const showImage = image && !imgError;

  return (
    <Link
      href={`/catalog?category=${slug}`}
      className="group relative h-40 sm:h-52 lg:h-60 rounded-2xl overflow-hidden block"
    >
      {showImage ? (
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
          sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 30vw"
          onError={() => setImgError(true)}
        />
      ) : (
        /* CSS-градиент если нет фото */
        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/8" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5" />
          <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl opacity-20 select-none">
            {style.emoji}
          </div>
        </div>
      )}

      {/* Градиент-оверлей */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-colors duration-300" />

      {/* Текст */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <p className="font-display font-bold text-white text-sm sm:text-base lg:text-lg leading-tight">
          {name}
        </p>
        <p className="text-white/55 text-[11px] sm:text-xs mt-0.5">{productCount} товаров</p>
      </div>

      {/* Hover CTA */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="bg-brand-orange text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
          Смотреть →
        </span>
      </div>
    </Link>
  );
}
