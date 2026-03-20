"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

// Только собственные фото без водяных знаков
const PHOTOS = [
  { src: "/images/production/sklad-1.jpg",  alt: "Склад пиломатериалов ПилоРус" },
  { src: "/images/production/sklad-2.jpg",  alt: "Хранение пиломатериалов" },
  { src: "/images/production/sklad-3.jpg",  alt: "Производственный склад" },
  { src: "/images/production/sklad-4.jpg",  alt: "Брус на складе" },
  { src: "/images/production/prod-7.jpg",   alt: "Производство" },
  { src: "/images/production/prod-8.jpg",   alt: "Обработка древесины" },
  { src: "/images/production/prod-9.jpg",   alt: "Пиломатериалы" },
  { src: "/images/production/prod-10.jpg",  alt: "Готовая продукция" },
  { src: "/images/production/prod-11.jpg",  alt: "Доска обрезная" },
  { src: "/images/production/prod-12.jpg",  alt: "Производственный цех" },
  { src: "/images/production/prod-13.jpg",  alt: "Склад готовой продукции" },
  { src: "/images/production/prod-14.jpg",  alt: "Пакет пиломатериалов" },
  { src: "/images/production/prod-15.jpg",  alt: "Производственный цех" },
  { src: "/images/production/prod-16.jpg",  alt: "Вагонка" },
  { src: "/images/production/prod-17.jpg",  alt: "Брус строганный" },
  { src: "/images/production/prod-18.jpg",  alt: "Доска" },
  { src: "/images/production/prod-19.jpg",  alt: "Производство" },
  { src: "/images/production/prod-20.jpg",  alt: "Склад" },
  { src: "/images/production/prod-21.jpg",  alt: "Пиломатериалы" },
  { src: "/images/production/prod-22.jpg",  alt: "Готовая продукция" },
];

export function ProductionGallery() {
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      {/* Подсказка */}
      <p className="text-white/40 text-xs mb-3 flex items-center gap-1.5 select-none">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-60">
          <path d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Перетащите для просмотра
      </p>

      {/* Лента */}
      <div ref={constraintsRef} className="overflow-hidden rounded-2xl">
        <motion.div
          drag="x"
          dragConstraints={constraintsRef}
          dragElastic={0.06}
          className="flex gap-3 cursor-grab active:cursor-grabbing select-none"
          style={{ width: "max-content" }}
          whileTap={{ cursor: "grabbing" }}
        >
          {PHOTOS.map((photo, i) => (
            <div
              key={i}
              className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-xl overflow-hidden shrink-0 group"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className="object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105"
                sizes="208px"
                draggable={false}
              />
              {/* Тонкий overlay при наведении */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 rounded-xl" />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Fade edges — чёрные под тёмный фон секции About */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/90 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/90 to-transparent pointer-events-none" />
    </div>
  );
}
