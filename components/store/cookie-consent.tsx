"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies-accepted");
    if (!accepted) {
      const t = setTimeout(() => {
        if (!localStorage.getItem("cookies-accepted")) setVisible(true);
      }, 1500);
      const hide = () => setVisible(false);
      window.addEventListener("cookies-accepted", hide);
      return () => {
        clearTimeout(t);
        window.removeEventListener("cookies-accepted", hide);
      };
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (visible) {
      document.body.dataset.storeCookieVisible = "true";
    } else {
      delete document.body.dataset.storeCookieVisible;
    }

    return () => {
      delete document.body.dataset.storeCookieVisible;
    };
  }, [visible]);

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
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[60] px-3 pb-1 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[520px] sm:px-0 sm:pb-0 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm"
    >
      <div className="flex flex-col gap-2 rounded-[18px] border border-border/60 bg-background/95 p-3 shadow-2xl  sm:gap-3 sm:rounded-2xl sm:p-4">

        {/* Иконка + текст */}
        <div className="flex gap-3 items-start">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary sm:mt-0.5 sm:flex">
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
            <p className="mb-1 text-[13px] font-semibold leading-tight sm:text-sm">Мы используем cookies</p>
            <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
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
            className="flex-1 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-95 sm:py-2.5"
          >
            Принять
          </button>
          <button
            onClick={accept}
            className="rounded-xl border border-border px-4 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
