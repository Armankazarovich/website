"use client";

import { useEffect, useState } from "react";
import { useFloatingChromeHidden } from "@/lib/use-floating-ui";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const floatingChromeHidden = useFloatingChromeHidden();

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Наверх"
      style={{
        opacity: visible && !floatingChromeHidden ? 1 : 0,
        transform: visible && !floatingChromeHidden ? "translateY(0)" : "translateY(12px)",
        pointerEvents: visible && !floatingChromeHidden ? "auto" : "none",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
      className="fixed bottom-24 right-4 z-40 hidden h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/90 text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:flex lg:bottom-24 lg:right-6"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
