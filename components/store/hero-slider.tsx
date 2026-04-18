"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

const SLIDES = [
  { src: "/images/production/sklad-1.jpg", alt: "Склад пиломатериалов ПилоРус" },
  { src: "/images/production/sklad-2.jpg", alt: "Доска обрезная на складе" },
  { src: "/images/production/sklad-3.jpg", alt: "Производство ПилоРус" },
  { src: "/images/production/sklad-4.jpg", alt: "Брус строительный" },
  { src: "/images/production/sklad-5.jpg", alt: "Погрузка пиломатериалов" },
];

const INTERVAL = 3800; // ms

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -120]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div style={{ y }} className="absolute inset-0 will-change-transform">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDuration: "1500ms" }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Slide indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === current ? "bg-white w-6" : "bg-white/40 w-2"
            }`}
            aria-label={`Слайд ${i + 1}`}
          />
        ))}
      </div>
    </motion.div>
  );
}
