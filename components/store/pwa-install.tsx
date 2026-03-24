"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus } from "lucide-react";

type Platform = "ios-safari" | "ios-other" | "android" | "desktop-chrome" | "desktop-other" | "installed" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if ((window.navigator as any).standalone === true) return "installed";

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);

  if (isIOS && isSafari) return "ios-safari";
  if (isIOS) return "ios-other";
  if (isAndroid) return "android";
  if (isChrome) return "desktop-chrome";
  return "desktop-other";
}

const DISMISS_KEY = "pwa-banner-v3";
const DISMISS_DAYS = 30;

export function PwaInstall() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (p === "installed" || p === null) return;

    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw);
        if (Date.now() - ts < DISMISS_DAYS * 86400_000) return;
      }
    } catch {}

    const timer = setTimeout(() => setVisible(true), 5000);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
    } catch {}
  };

  const handleInstall = async () => {
    if (platform === "ios-safari" || platform === "ios-other") {
      setShowSteps(true);
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") dismiss();
    }
  };

  if (!visible || platform === "installed" || platform === null) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed right-4 bottom-[84px] lg:bottom-6 z-[150] w-[300px] sm:w-[320px]"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
            {/* Brand accent stripe */}
            <div className="h-1 bg-gradient-to-r from-brand-orange to-brand-brown" />

            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  <img src="/logo.png" alt="ПилоРус" width={32} height={32} className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight">ПилоРус — приложение</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {platform === "ios-other"
                      ? "Откройте в Safari для установки"
                      : platform === "desktop-other"
                      ? "Откройте в Chrome"
                      : "Быстрый доступ без браузера"}
                  </p>
                </div>
                <button
                  onClick={dismiss}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 -mt-0.5"
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* iOS steps */}
              {showSteps && platform === "ios-safari" && (
                <div className="mt-3 space-y-1.5">
                  {[
                    { icon: <Share className="w-3.5 h-3.5 text-primary shrink-0" />, text: 'Нажмите «Поделиться» в Safari' },
                    { icon: <Plus className="w-3.5 h-3.5 text-primary shrink-0" />, text: 'Выберите «На экран "Домой"»' },
                    { icon: <span className="text-primary text-xs font-bold shrink-0">✓</span>, text: 'Нажмите «Добавить»' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                      {s.icon} {s.text}
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {!showSteps && (
                <div className="mt-3 flex items-center gap-2">
                  {(platform === "android" || platform === "desktop-chrome") && installPrompt && (
                    <button
                      onClick={handleInstall}
                      className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold transition-colors hover:bg-primary/90"
                    >
                      Установить
                    </button>
                  )}
                  {platform === "ios-safari" && (
                    <button
                      onClick={handleInstall}
                      className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold transition-colors hover:bg-primary/90"
                    >
                      Как установить
                    </button>
                  )}
                  <button
                    onClick={dismiss}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                  >
                    Не сейчас
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
