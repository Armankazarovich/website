"use client";

import { useEffect, useState } from "react";
import { Share, Plus, CheckCircle2, X, Smartphone } from "lucide-react";

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

// Мини-шар — SVG оранжевый шар для превью
function ArayBall({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="ball-g" cx="36%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#FFBB6B" />
          <stop offset="22%"  stopColor="#FF8C2A" />
          <stop offset="48%"  stopColor="#E8700A" />
          <stop offset="72%"  stopColor="#C45500" />
          <stop offset="100%" stopColor="#8B3200" />
        </radialGradient>
        <radialGradient id="shine-g" cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Свечение */}
      <circle cx="50" cy="50" r="46" fill="rgba(232,112,10,0.22)" />
      {/* Шар */}
      <circle cx="50" cy="50" r="42" fill="url(#ball-g)" />
      {/* Блик */}
      <ellipse cx="38" cy="34" rx="14" ry="10" fill="url(#shine-g)" transform="rotate(-20,38,34)" />
      {/* Маленький блик */}
      <circle cx="40" cy="30" r="5" fill="rgba(255,255,255,0.65)" />
    </svg>
  );
}

export function AdminPwaInstall() {
  const [platform, setPlatform]       = useState<Platform>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showSteps, setShowSteps]     = useState(false);
  const [installed, setInstalled]     = useState(false);
  const [dismissed, setDismissed]     = useState(false);

  useEffect(() => {
    if (localStorage.getItem("aray-pwa-dismissed") === "1") {
      setDismissed(true);
    }
    const p = detectPlatform();
    setPlatform(p);
    if (p === "installed") setInstalled(true);

    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (platform === "ios-safari" || platform === "ios-other") {
      setShowSteps(v => !v);
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("aray-pwa-dismissed", "1");
  };

  if (installed || dismissed || platform === null) return null;
  if (platform === "desktop-other") return null;
  if ((platform === "desktop-chrome" || platform === "android") && !installPrompt) return null;

  return (
    <div className="px-3 pb-2">
      {!showSteps ? (
        /* ── Карточка установки ── */
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(232,112,10,0.18) 0%, rgba(232,112,10,0.06) 100%)",
            border: "1px solid rgba(232,112,10,0.28)",
          }}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-3 h-3 text-white/40" />
          </button>

          <button onClick={handleInstall} className="w-full flex items-center gap-3 p-3 pr-7 text-left">
            {/* Шар */}
            <div className="relative shrink-0">
              <ArayBall size={44} />
              {/* Пульс-кольцо */}
              <div
                className="absolute inset-[-4px] rounded-full"
                style={{
                  border: "1.5px solid rgba(232,112,10,0.45)",
                  animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white leading-tight">Установить Арай</p>
              <p className="text-[10px] text-white/50 mt-0.5 leading-tight">
                {platform === "ios-safari"
                  ? "Добавить на экран «Домой»"
                  : platform === "android"
                  ? "Установить как приложение"
                  : "Открыть как приложение"}
              </p>
            </div>

            <div
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl"
              style={{ background: "linear-gradient(135deg, #FF8C2A, #E8700A)" }}
            >
              {platform === "ios-safari" ? (
                <Share className="w-3.5 h-3.5 text-white" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-white" />
              )}
            </div>
          </button>
        </div>

      ) : (
        /* ── iOS инструкция ── */
        <div
          className="rounded-2xl p-3.5 space-y-2.5"
          style={{
            background: "rgba(232,112,10,0.12)",
            border: "1px solid rgba(232,112,10,0.25)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArayBall size={28} />
              <p className="text-[12px] font-bold text-white">Установить Арай</p>
            </div>
            <button onClick={() => setShowSteps(false)} className="text-white/40 hover:text-white/80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {[
              { icon: Share,        text: 'Нажмите «Поделиться» в Safari' },
              { icon: Plus,         text: '«На экран "Домой"»' },
              { icon: CheckCircle2, text: 'Нажмите «Добавить»' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(232,112,10,0.25)" }}
                >
                  <Icon className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-[11px] text-white/75">{text}</span>
              </div>
            ))}
          </div>

          {platform === "ios-other" && (
            <p className="text-[10px] text-orange-400/70 pt-1 border-t border-white/10">
              Откройте <span className="font-semibold">pilo-rus.ru/admin</span> в Safari
            </p>
          )}
        </div>
      )}
    </div>
  );
}
