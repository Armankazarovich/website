"use client";

import React, { useEffect, useState } from "react";
import { X, Download, Share, Plus, MoreVertical } from "lucide-react";

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

const DISMISS_KEY = "pwa-banner-v2";
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

    // Check if dismissed recently
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw);
        if (Date.now() - ts < DISMISS_DAYS * 86400_000) return;
      }
    } catch {}

    // Show after 5s delay
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
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-xl mx-auto relative rounded-2xl backdrop-blur-xl bg-zinc-900/96 border border-white/10 shadow-2xl shadow-black/50 p-4 overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-orange/8 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex items-start gap-3">
          {/* App icon */}
          <div className="w-11 h-11 rounded-xl bg-brand-orange flex items-center justify-center shrink-0 shadow-lg shadow-brand-orange/30">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-white leading-tight">ПилоРус — приложение</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {platform === "ios-other"
                    ? "Откройте в Safari для установки"
                    : platform === "desktop-other"
                    ? "Откройте в Chrome для установки"
                    : "Быстрый доступ без браузера"}
                </p>
              </div>
              <button
                onClick={dismiss}
                className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* iOS steps */}
            {showSteps && (
              <div className="mt-3 space-y-1.5">
                {platform === "ios-other" ? (
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
                    <Share className="w-3.5 h-3.5 shrink-0" />
                    Откройте этот сайт в Safari для установки
                  </div>
                ) : (
                  <>
                    {[
                      { icon: <Share className="w-3.5 h-3.5 text-brand-orange shrink-0" />, text: 'Нажмите «Поделиться» внизу Safari' },
                      { icon: <Plus className="w-3.5 h-3.5 text-brand-orange shrink-0" />, text: 'Выберите «На экран "Домой"»' },
                      { icon: <span className="text-brand-orange text-xs font-bold shrink-0 w-3.5 text-center">✓</span>, text: 'Нажмите «Добавить» — готово!' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-300 bg-white/5 rounded-lg px-3 py-2">
                        {step.icon}
                        {step.text}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Action buttons */}
            {!showSteps && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {(platform === "android" || platform === "desktop-chrome") && installPrompt && (
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-brand-orange/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Установить
                  </button>
                )}
                {platform === "ios-safari" && (
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-brand-orange/20"
                  >
                    <Share className="w-3.5 h-3.5" />
                    Как установить
                  </button>
                )}
                {(platform === "desktop-other" ||
                  platform === "ios-other" ||
                  (platform === "desktop-chrome" && !installPrompt) ||
                  (platform === "android" && !installPrompt)) && (
                  <p className="text-xs text-zinc-500">
                    {platform === "ios-other"
                      ? "Откройте в Safari →"
                      : <>Откройте в Chrome → <span className="inline-flex items-center gap-0.5 text-zinc-400"><MoreVertical className="w-3 h-3" /> → «Установить»</span></>}
                  </p>
                )}
                <button
                  onClick={dismiss}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-auto"
                >
                  Не сейчас
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
