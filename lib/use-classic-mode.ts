"use client";

import { useState, useEffect } from "react";

/**
 * useClassicMode — определяет, нужен ли "классический" (непрозрачный) стиль UI.
 *
 * Classic = true когда:
 * 1. Светлая тема (glass-эффекты плохо смотрятся на белом фоне)
 * 2. bgMode = "classic" в localStorage
 *
 * ВАЖНО: компоненты (QuickView, ConfirmDialog, Search и т.д.) рендерятся через Portal,
 * поэтому не могут полагаться на CSS-классы родителей. Этот хук — единственный способ
 * корректно определить режим из любого места.
 */
export function useClassicMode() {
  const [classic, setClassic] = useState(false);

  useEffect(() => {
    const check = () => {
      // Светлая тема → ВСЕГДА classic
      const html = document.documentElement;
      const isLight =
        html.classList.contains("light") ||
        html.getAttribute("data-theme") === "light" ||
        html.style.colorScheme === "light" ||
        (!html.classList.contains("dark") && window.matchMedia("(prefers-color-scheme: light)").matches);

      const lsClassic = localStorage.getItem("aray-classic-mode") === "1";
      setClassic(isLight || lsClassic);
    };

    check();

    // Реагируем на смену bgMode
    window.addEventListener("aray-classic-change", check);

    // Реагируем на смену темы (next-themes меняет класс на <html>)
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    return () => {
      window.removeEventListener("aray-classic-change", check);
      obs.disconnect();
    };
  }, []);

  return classic;
}
