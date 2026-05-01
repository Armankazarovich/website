"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Share, X } from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";
import { ARAY_ICON_TONE } from "@/lib/aray-design-tokens";

type Platform =
  | "ios-safari"
  | "ios-other"
  | "android"
  | "desktop-chrome"
  | "desktop-other"
  | "installed"
  | null;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallWindow = Window & {
  __arayBeforeInstallPrompt?: BeforeInstallPromptEvent;
};

function rememberInstallPrompt(event: BeforeInstallPromptEvent) {
  event.preventDefault();
  (window as PwaInstallWindow).__arayBeforeInstallPrompt = event;
  window.dispatchEvent(new Event("aray:pwa-install-ready"));
}

export function AdminPwaInstallBridge() {
  useEffect(() => {
    const installHandler = (event: Event) => rememberInstallPrompt(event as BeforeInstallPromptEvent);
    const installedHandler = () => {
      delete (window as PwaInstallWindow).__arayBeforeInstallPrompt;
      window.dispatchEvent(new Event("aray:pwa-installed"));
    };

    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  return null;
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if ((window.navigator as { standalone?: boolean }).standalone === true) return "installed";

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  const isChrome = /Chrome|CriOS/.test(ua);

  if (isIOS && isSafari) return "ios-safari";
  if (isIOS) return "ios-other";
  if (isAndroid) return "android";
  if (isChrome) return "desktop-chrome";
  return "desktop-other";
}

export function AdminPwaInstall() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("aray-pwa-dismissed") === "1") {
      setDismissed(true);
    }

    const detected = detectPlatform();
    setPlatform(detected);
    if (detected === "installed") setInstalled(true);
    setInstallPrompt((window as PwaInstallWindow).__arayBeforeInstallPrompt ?? null);

    const readyHandler = () => {
      setInstallPrompt((window as PwaInstallWindow).__arayBeforeInstallPrompt ?? null);
    };
    const installHandler = (event: Event) => rememberInstallPrompt(event as BeforeInstallPromptEvent);
    const installedHandler = () => {
      delete (window as PwaInstallWindow).__arayBeforeInstallPrompt;
      setInstalled(true);
    };

    window.addEventListener("aray:pwa-install-ready", readyHandler);
    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("aray:pwa-install-ready", readyHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (platform === "ios-safari" || platform === "ios-other") {
      setShowSteps((value) => !value);
      return;
    }
    if (!installPrompt) return;

    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("aray-pwa-dismissed", "1");
  };

  if (installed || dismissed || platform === null) return null;
  if (platform === "desktop-other") return null;
  if ((platform === "desktop-chrome" || platform === "android") && !installPrompt) return null;

  const isIOS = platform === "ios-safari" || platform === "ios-other";

  return (
    <div className="admin-pwa-install">
      <div className="admin-pwa-card admin-popup-liquid relative overflow-hidden rounded-2xl border p-3">
        <button
          type="button"
          onClick={handleDismiss}
          className="admin-nav-panel-close absolute right-2 top-2 h-7 w-7"
          aria-label="Закрыть"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleInstall}
          className="flex w-full items-center gap-3 pr-7 text-left"
        >
          <div className="shrink-0">
            <ArayOrb size={40} id="pwa-install" pulse="idle" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Установить Арай</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {isIOS
                ? "Добавить админку на экран Домой"
                : "Открывать как отдельное приложение"}
            </p>
          </div>
          <div className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
            {isIOS ? <Share className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </div>
        </button>

        {showSteps && (
          <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
            {[
              { icon: Share, text: "Открой меню Поделиться в Safari" },
              { icon: Plus, text: "Выбери На экран Домой" },
              { icon: CheckCircle2, text: "Нажми Добавить" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <span className={`${ARAY_ICON_TONE} flex h-7 w-7 shrink-0 items-center justify-center rounded-lg`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{text}</span>
              </div>
            ))}
            {platform === "ios-other" && (
              <p className="text-[11px] text-primary/80">
                На iPhone установка PWA работает через Safari.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
