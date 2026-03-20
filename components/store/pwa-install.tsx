"use client";

import { useEffect, useState } from "react";
import { Smartphone, Download, X } from "lucide-react";

type Platform = "ios" | "android" | "desktop" | "installed" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;

  // Already installed as PWA
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if ((window.navigator as any).standalone === true) return "installed";

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function PwaInstall() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    setPlatform(detectPlatform());

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || platform === "installed" || platform === null) return null;

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") setDismissed(true);
    }
  };

  return (
    <div className="border-t border-zinc-800 mt-8 pt-6">
      <div className="flex items-start gap-4">
        {/* App icon */}
        <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center shrink-0">
          <Smartphone className="w-6 h-6 text-brand-orange" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-sm text-white">
              Установите наше приложение
            </h4>
            <button
              onClick={() => setDismissed(true)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 mb-3">
            Быстрый доступ к каталогу и заказам прямо с экрана телефона
          </p>

          {/* iOS instructions */}
          {platform === "ios" && (
            <div className="space-y-1.5">
              {[
                { step: "1", text: 'Нажмите кнопку «Поделиться» (□↑) в Safari' },
                { step: "2", text: 'Выберите «На экран «Домой»»' },
                { step: "3", text: 'Нажмите «Добавить»' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="w-4 h-4 rounded-full bg-brand-orange/20 text-brand-orange text-[10px] flex items-center justify-center font-bold shrink-0">
                    {s.step}
                  </span>
                  {s.text}
                </div>
              ))}
            </div>
          )}

          {/* Android / Desktop — install button */}
          {(platform === "android" || platform === "desktop") && (
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-2 bg-brand-orange text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-brand-orange/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Установить приложение
            </button>
          )}

          {/* Fallback for desktop without install prompt */}
          {platform === "desktop" && !installPrompt && (
            <p className="text-xs text-zinc-500 mt-1">
              Откройте сайт в Chrome и нажмите «Установить» в адресной строке
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
