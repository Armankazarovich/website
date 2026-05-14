"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Chrome, Download, ExternalLink, Plus, Share, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { resolvePwaInstallContext } from "@/lib/pwa-install-context";
import {
  clearStoredPwaInstallPrompt,
  detectPwaPlatform,
  getStoredPwaInstallPrompt,
  rememberPwaInstallPrompt,
  writePreferredPwaStart,
  type BeforeInstallPromptEvent,
  type PwaPlatform,
} from "@/lib/pwa-install-events";

type InstallState = "idle" | "installing" | "dismissed" | "error";

type InstallStep = {
  icon: ReactNode;
  text: string;
};

function getStoreInstallSteps(platform: PwaPlatform, shortName: string, hasNativePrompt: boolean): InstallStep[] {
  if (platform === "ios-safari") {
    return [
      { icon: <Share className="h-3.5 w-3.5 text-primary" />, text: "Нажмите «Поделиться» в Safari." },
      { icon: <Plus className="h-3.5 w-3.5 text-primary" />, text: `Выберите «На экран Домой» для ${shortName}.` },
      { icon: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />, text: "Проверьте название и нажмите «Добавить»." },
    ];
  }

  if (platform === "ios-other") {
    return [
      { icon: <ExternalLink className="h-3.5 w-3.5 text-primary" />, text: "Откройте эту страницу в Safari." },
      { icon: <Share className="h-3.5 w-3.5 text-primary" />, text: "В Safari нажмите «Поделиться»." },
      { icon: <Plus className="h-3.5 w-3.5 text-primary" />, text: `Добавьте ${shortName} на экран Домой.` },
    ];
  }

  if (platform === "android") {
    return [
      { icon: <Chrome className="h-3.5 w-3.5 text-primary" />, text: "Лучше открыть страницу в Chrome." },
      {
        icon: <Download className="h-3.5 w-3.5 text-primary" />,
        text: hasNativePrompt
          ? "Нажмите кнопку установки ниже."
          : "Если пункт доступен, выберите «Установить приложение» в меню браузера.",
      },
      { icon: <Plus className="h-3.5 w-3.5 text-primary" />, text: `После установки ${shortName} появится на экране устройства.` },
    ];
  }

  if (platform === "desktop-chrome") {
    return [
      { icon: <Chrome className="h-3.5 w-3.5 text-primary" />, text: "В Chrome или Edge нажмите значок установки в адресной строке." },
      {
        icon: <Download className="h-3.5 w-3.5 text-primary" />,
        text: hasNativePrompt
          ? "Или используйте кнопку установки ниже."
          : "Если значка нет, откройте меню браузера и выберите установку приложения.",
      },
      { icon: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />, text: `После установки ${shortName} будет запускаться отдельным окном.` },
    ];
  }

  return [
    { icon: <Chrome className="h-3.5 w-3.5 text-primary" />, text: "Для установки откройте страницу в Chrome, Edge или Safari на iPhone." },
    { icon: <Plus className="h-3.5 w-3.5 text-primary" />, text: `После установки ${shortName} будет запускаться как отдельное приложение.` },
  ];
}

function getPlatformLabel(platform: PwaPlatform) {
  if (platform === "ios-safari") return "iPhone / iPad Safari";
  if (platform === "ios-other") return "iPhone / iPad";
  if (platform === "android") return "Android";
  if (platform === "desktop-chrome") return "Chrome / Edge";
  if (platform === "desktop-other") return "Браузер";
  return "Устройство";
}

export function PwaInstall() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = resolvePwaInstallContext(pathname || "/", searchParams);
  const [platform, setPlatform] = useState<PwaPlatform>(null);
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [installState, setInstallState] = useState<InstallState>("idle");

  const refreshInstallState = useCallback(() => {
    const detected = detectPwaPlatform();
    setPlatform(detected);
    setInstallPrompt(getStoredPwaInstallPrompt());
  }, []);

  useEffect(() => {
    writePreferredPwaStart(context.id, context.startUrl);
    setInstallState("idle");
    setShowSteps(false);
  }, [context.id, context.startUrl]);

  useEffect(() => {
    refreshInstallState();

    const installedApps = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<unknown[]>;
    };
    if (installedApps.getInstalledRelatedApps) {
      installedApps
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps.length > 0) setAlreadyInstalled(true);
        })
        .catch(() => {});
    }

    const readyHandler = () => {
      setInstallPrompt(getStoredPwaInstallPrompt());
      setInstallState("idle");
    };
    const installHandler = (event: Event) => {
      rememberPwaInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      clearStoredPwaInstallPrompt();
      setInstallPrompt(null);
      setPlatform("installed");
      setVisible(false);
    };

    window.addEventListener("aray:pwa-install-ready", readyHandler);
    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("aray:pwa-install-ready", readyHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [refreshInstallState]);

  const dismiss = () => {
    setVisible(false);
  };

  const handleInstall = async () => {
    writePreferredPwaStart(context.id, context.startUrl);

    if (!installPrompt || platform === "ios-safari" || platform === "ios-other") {
      setShowSteps(true);
      setInstallState("idle");
      return;
    }

    setInstallState("installing");

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      clearStoredPwaInstallPrompt();
      setInstallPrompt(null);

      if (result.outcome === "accepted") {
        dismiss();
        return;
      }

      setInstallState("dismissed");
      setShowSteps(true);
    } catch {
      clearStoredPwaInstallPrompt();
      setInstallPrompt(null);
      setInstallState("error");
      setShowSteps(true);
    }
  };

  const hasNativePrompt = Boolean(installPrompt) && (platform === "android" || platform === "desktop-chrome");
  const manualSteps = useMemo(
    () => getStoreInstallSteps(platform, context.shortName, hasNativePrompt),
    [context.shortName, hasNativePrompt, platform],
  );

  if (platform === "installed" || platform === null) return null;

  const canNativeInstall = !alreadyInstalled && hasNativePrompt && installState !== "installing";
  if (!visible && !installPrompt) return null;

  const statusText = (() => {
    if (alreadyInstalled) return "Если значок уже есть, откройте его с экрана устройства или из списка приложений.";
    if (installState === "installing") return "Жду ответ браузера. Обычно это занимает пару секунд.";
    if (installState === "dismissed") return "Браузер отклонил запрос. Можно вернуться к установке позже.";
    if (installState === "error") return "Системная установка не открылась. Ниже оставил ручные шаги.";
    if (platform === "ios-other") return "На iPhone установка работает через Safari.";
    if (platform === "desktop-other") return "Этот браузер может не дать установку. Надежнее открыть Chrome или Edge.";
    if (hasNativePrompt) return "Можно установить системной кнопкой.";
    return context.installDescription;
  })();

  return (
    <>
      <button
        data-admin-pwa-launcher
        type="button"
        onClick={() => {
          refreshInstallState();
          setShowSteps(false);
          setVisible(true);
        }}
        className="fixed right-[max(0.75rem,env(safe-area-inset-right,0px))] bottom-[calc(5.85rem+env(safe-area-inset-bottom,0px))] z-40 hidden items-center gap-2 rounded-2xl border border-border bg-card/95 px-2.5 py-2 text-sm font-semibold text-foreground shadow-xl shadow-black/10 transition-colors hover:border-primary/30 hover:bg-card sm:inline-flex lg:bottom-6"
        aria-label={context.installTitle}
        title={context.installTitle}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm">
          <img src="/logo.png" alt="" width={24} height={24} className="object-contain" />
        </span>
        <span className="hidden sm:inline">Приложение</span>
        {installPrompt && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed right-[max(0.75rem,env(safe-area-inset-right,0px))] bottom-[calc(9.3rem+env(safe-area-inset-bottom,0px))] z-[150] w-[calc(100vw-1.5rem)] max-w-[320px] lg:bottom-20"
          >
            <div className="max-h-[calc(100dvh-10.5rem)] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl shadow-black/10 dark:shadow-black/40">
              <div className="h-1 bg-gradient-to-r from-brand-orange to-brand-brown" />

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm">
                    <img
                      src="/logo.png"
                      alt="ПилоРус"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight text-foreground">
                      {context.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {statusText}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="-mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Закрыть"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span className="rounded-full border border-border bg-muted/30 px-2 py-1">Контекст: {context.shortName}</span>
                  <span className="rounded-full border border-border bg-muted/30 px-2 py-1">{getPlatformLabel(platform)}</span>
                </div>

                {(showSteps || !hasNativePrompt || installState === "dismissed" || installState === "error") && !alreadyInstalled && (
                  <div className="mt-3 space-y-1.5">
                    {manualSteps.map((step, index) => (
                      <div
                        key={`${index}:${step.text}`}
                        className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
                      >
                        <span className="shrink-0">{step.icon}</span>
                        <span className="min-w-0 leading-relaxed">{step.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {alreadyInstalled ? (
                    <button
                      type="button"
                      onClick={dismiss}
                      className="flex-1 rounded-xl bg-primary py-2 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Понятно
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInstall}
                      disabled={installState === "installing"}
                      className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      {installState === "installing"
                        ? "Открываю установку"
                        : canNativeInstall
                          ? context.installCta
                          : "Как установить"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={dismiss}
                    className="px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Не сейчас
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
