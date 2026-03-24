"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies-accepted");
    if (!accepted) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookies-accepted", "1");
    setVisible(false);
    window.dispatchEvent(new Event("cookies-accepted"));
  };

  if (!visible) return null;

  return (
    <div
      style={{
        opacity: 1,
        animation: "slideUp 0.3s ease forwards",
      }}
      className="fixed bottom-[72px] left-0 right-0 z-[90] px-3 pb-1 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm lg:px-0 lg:pb-0"
    >
      <div className="bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">

        {/* Иконка + текст */}
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M15 2.5C15.5 4 15 5.5 14 6.5C15.5 6 17 6.5 18 7.5C17.5 6 18 4.5 19.5 4C18 3.5 16 3 15 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <circle cx="8.5" cy="9.5" r="1.2" fill="currentColor"/>
              <circle cx="14" cy="14" r="1.2" fill="currentColor"/>
              <circle cx="9" cy="15" r="0.9" fill="currentColor"/>
              <circle cx="13.5" cy="9" r="0.9" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight mb-1">Мы используем cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Для улучшения работы сайта и аналитики. Продолжая использование, вы соглашаетесь с нашей{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                политикой конфиденциальности
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            Принять
          </button>
          <button
            onClick={accept}
            className="px-4 text-xs font-medium text-muted-foreground border border-border rounded-xl hover:bg-accent hover:text-foreground transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
