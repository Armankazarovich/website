"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share, Plus, CheckCircle2, X } from "lucide-react";

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

export function AdminPwaInstall() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (p === "installed") setInstalled(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Слушаем успешную установку
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (platform === "ios-safari") {
      setShowSteps((v) => !v);
      return;
    }
    if (platform === "ios-other") {
      setShowSteps((v) => !v);
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
    }
  };

  // Скрываем если: установлено, неизвестная платформа, или нет способа установить
  if (installed || platform === null) return null;
  if (platform === "desktop-other") return null;
  if ((platform === "desktop-chrome" || platform === "android") && !installPrompt && !showSteps) return null;

  return (
    <div className="px-3 pb-1">
      {/* Кнопка */}
      {!showSteps ? (
        <button
          onClick={handleInstall}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors group"
          title="Установить приложение ПилоРус на устройство"
        >
          <Smartphone className="w-4 h-4 shrink-0 group-hover:text-white transition-colors" />
          <span className="flex-1 text-left text-xs leading-tight">
            Установить приложение
          </span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-white/15 text-white/80 shrink-0">
            PWA
          </span>
        </button>
      ) : (
        /* iOS инструкция */
        <div className="bg-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-white">Как установить:</p>
            <button onClick={() => setShowSteps(false)} className="text-white/50 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-white/80">
              <Share className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <span>Нажмите «Поделиться» в Safari</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/80">
              <Plus className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <span>«На экран "Домой"»</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <span>Нажмите «Добавить»</span>
            </div>
          </div>
          {platform === "ios-other" && (
            <p className="text-[10px] text-white/50 pt-1">
              Откройте pilo-rus.ru/admin в Safari для установки
            </p>
          )}
        </div>
      )}
    </div>
  );
}
