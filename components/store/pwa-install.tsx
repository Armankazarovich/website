"use client";

import React, { useEffect, useState } from "react";
import { X, Download, Share, Plus, MoreVertical, Chrome } from "lucide-react";

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

const PLATFORM_INFO: Record<string, { icon: React.ReactNode; title: string; subtitle: string }> = {
  "ios-safari": {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-300"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,
    title: "Установите приложение",
    subtitle: "Быстрый доступ с экрана iPhone / iPad",
  },
  "ios-other": {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-300"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,
    title: "Откройте в Safari",
    subtitle: "Для установки нужен Safari",
  },
  android: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#3DDC84]"><path d="M17.523 15.341a.5.5 0 01-.694.132l-3.08-2.18a.5.5 0 00-.554 0l-3.08 2.18a.5.5 0 01-.694-.132l-.408-.577a.5.5 0 01.098-.689l2.892-2.046V7a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v4.029l2.892 2.046a.5.5 0 01.098.689zM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z"/></svg>,
    title: "Установите приложение",
    subtitle: "Быстрый доступ с экрана Android",
  },
  "desktop-chrome": {
    icon: <Chrome className="w-5 h-5 text-blue-400" />,
    title: "Установите приложение",
    subtitle: "Быстрый доступ без браузера",
  },
  "desktop-other": {
    icon: <Download className="w-5 h-5 text-zinc-300" />,
    title: "Установите приложение",
    subtitle: "Откройте в Chrome для установки",
  },
};

export function PwaInstall() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || platform === "installed" || platform === null) return null;

  const handleInstall = async () => {
    if (platform === "ios-safari") { setShowIOSGuide(true); return; }
    if (platform === "ios-other") { setShowIOSGuide(true); return; }
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") setDismissed(true);
    }
  };

  const info = PLATFORM_INFO[platform] ?? PLATFORM_INFO["desktop-other"];

  return (
    <div className="border-t border-white/5 mt-8 pt-6">
      {/* Main banner */}
      <div className="relative rounded-2xl overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 p-4">
        {/* Subtle glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-orange/5 to-transparent pointer-events-none" />

        <div className="relative flex items-start gap-4">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-brand-orange/20 border border-brand-orange/30 backdrop-blur-sm flex items-center justify-center shrink-0">
            {info.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-white">{info.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{info.subtitle}</p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-0.5"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* iOS Safari — show steps */}
            {showIOSGuide && (platform === "ios-safari" || platform === "ios-other") && (
              <div className="mt-3 space-y-2">
                {platform === "ios-other" ? (
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
                    <Share className="w-3.5 h-3.5 shrink-0" />
                    Откройте этот сайт в Safari для установки
                  </div>
                ) : (
                  <>
                    {[
                      { icon: <Share className="w-3.5 h-3.5 shrink-0 text-brand-orange" />, text: 'Нажмите кнопку «Поделиться» внизу Safari' },
                      { icon: <Plus className="w-3.5 h-3.5 shrink-0 text-brand-orange" />, text: 'Выберите «На экран "Домой"»' },
                      { icon: <span className="text-brand-orange text-xs font-bold shrink-0">✓</span>, text: 'Нажмите «Добавить» — готово!' },
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

            {/* Android / Desktop — install button */}
            {!showIOSGuide && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {(platform === "android" || platform === "desktop-chrome") && installPrompt && (
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Установить
                  </button>
                )}
                {platform === "ios-safari" && (
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                  >
                    <Share className="w-3.5 h-3.5" />
                    Как установить
                  </button>
                )}
                {(platform === "desktop-other" || (platform === "desktop-chrome" && !installPrompt)) && (
                  <p className="text-xs text-zinc-500">
                    Откройте в Chrome → нажмите
                    <span className="inline-flex items-center gap-0.5 mx-1 text-zinc-400">
                      <MoreVertical className="w-3 h-3" /> → «Установить»
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
