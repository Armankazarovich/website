"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { ARAY_FOCUS_RING } from "@/lib/aray-design-tokens";
import {
  getPwaIconSrc,
  resolvePwaInstallContext,
  resolvePwaInstallContextById,
  type PwaInstallContext,
} from "@/lib/pwa-install-context";
import {
  clearStoredPwaInstallPrompt,
  detectPwaPlatform,
  getStoredPwaInstallPrompt,
  rememberPwaInstallPrompt,
  writePreferredPwaStart,
  type BeforeInstallPromptEvent,
  type PwaPlatform,
} from "@/lib/pwa-install-events";
import { cn } from "@/lib/utils";

type InstallState = "idle" | "installing" | "accepted" | "dismissed" | "error";

const DISMISS_KEY = "aray:pwa-install-banner-dismissed-until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const HEADER_DISMISS_KEY = "aray:pwa-install-header-dismissed-until";
const HEADER_DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

export function AdminPwaInstallBridge() {
  useEffect(() => {
    const installHandler = (event: Event) => rememberPwaInstallPrompt(event as BeforeInstallPromptEvent);
    const installedHandler = () => {
      clearStoredPwaInstallPrompt();
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

function getPlatformLabel(platform: PwaPlatform) {
  if (platform === "ios-safari") return "iPhone / Safari";
  if (platform === "ios-other") return "iPhone / iPad";
  if (platform === "android") return "Android";
  if (platform === "desktop-chrome") return "Chrome / Edge";
  if (platform === "desktop-other") return "Браузер";
  return "Устройство";
}

function getManualInstallHint(platform: PwaPlatform) {
  if (platform === "ios-safari" || platform === "ios-other") return "Поделиться → На экран Домой";
  return "Меню браузера → Установить приложение";
}

function setDismissed() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
}

function clearDismissed() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DISMISS_KEY);
}

function isHeaderDismissed() {
  if (typeof window === "undefined") return true;
  const dismissedUntil = Number(window.localStorage.getItem(HEADER_DISMISS_KEY) || 0);
  return dismissedUntil > Date.now();
}

function dismissHeaderInstall() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HEADER_DISMISS_KEY, String(Date.now() + HEADER_DISMISS_MS));
}

function removeInstallParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("install")) return;
  url.searchParams.delete("install");
  const nextSearch = url.searchParams.toString();
  window.history.replaceState({}, "", `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`);
}

function PwaIconPreview({ context, size }: { context: PwaInstallContext; size: number }) {
  return (
    <img
      src={getPwaIconSrc(context, size)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="h-full w-full rounded-[inherit] object-contain"
      draggable={false}
    />
  );
}

export function AdminPwaInstall() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [manualContextId, setManualContextId] = useState<string | null>(null);
  const requestedContextId = searchParams.get("app");
  const context = manualContextId
    ? resolvePwaInstallContextById(manualContextId)
    : requestedContextId
      ? resolvePwaInstallContextById(requestedContextId)
      : resolvePwaInstallContext(pathname || "/", searchParams);
  const installIntent = searchParams.get("install") === "1";
  const targetName = context.shortName === "ARAY" ? "ARAY" : `ARAY: ${context.shortName}`;

  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [installed, setInstalled] = useState(false);

  const refreshInstallState = useCallback(() => {
    const detected = detectPwaPlatform();
    const prompt = getStoredPwaInstallPrompt();
    const nextInstalled = detected === "installed";

    setPlatform(detected);
    setInstallPrompt(prompt);
    setInstalled(nextInstalled);

    if (nextInstalled) {
      setOpen(false);
      return;
    }

    if (installIntent) {
      clearDismissed();
      setOpen(true);
      return;
    }

    setOpen(false);
  }, [installIntent]);

  useEffect(() => {
    refreshInstallState();

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
      setInstallState("accepted");
      setInstalled(true);
      setOpen(false);
    };
    const openHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ appId?: string }>).detail;
      if (detail?.appId) setManualContextId(detail.appId);
      clearDismissed();
      refreshInstallState();
      setOpen(true);
    };

    window.addEventListener("aray:pwa-install-ready", readyHandler);
    window.addEventListener("aray:pwa-installed", installedHandler);
    window.addEventListener("aray:pwa-install:open", openHandler);
    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("aray:pwa-install-ready", readyHandler);
      window.removeEventListener("aray:pwa-installed", installedHandler);
      window.removeEventListener("aray:pwa-install:open", openHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [refreshInstallState]);

  useEffect(() => {
    writePreferredPwaStart(context.id, context.startUrl);
  }, [context.id, context.startUrl]);

  const canNativeInstall = Boolean(installPrompt) && (platform === "android" || platform === "desktop-chrome");
  const isInstalling = installState === "installing";
  const manualHint = useMemo(() => getManualInstallHint(platform), [platform]);

  const description = (() => {
    if (installState === "error") return "Браузер не открыл установку. Можно поставить вручную через меню.";
    if (installState === "dismissed") return "Окно установки закрыто. Можно попробовать позже.";
    if (isInstalling) return "Открываю системное окно установки.";
    if (canNativeInstall) return "Откроется отдельным окном без лишних вкладок.";
    return "Можно открыть как отдельное приложение для этого раздела.";
  })();

  const dismissBanner = useCallback(() => {
    setDismissed();
    setOpen(false);
    removeInstallParam();
  }, []);

  const handleInstall = async () => {
    writePreferredPwaStart(context.id, context.startUrl);

    if (!installPrompt) {
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
        setInstallState("accepted");
        setInstalled(true);
        setOpen(false);
        return;
      }

      setInstallState("dismissed");
    } catch {
      clearStoredPwaInstallPrompt();
      setInstallPrompt(null);
      setInstallState("error");
    }
  };

  if (platform === null || installed || !open) return null;

  return (
    <aside
      className="fixed bottom-[calc(96px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[80] rounded-2xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:bottom-5 sm:left-auto sm:right-5 sm:w-[390px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/25 bg-background/70 p-1 shadow-[0_0_18px_rgb(var(--aray-accent)/0.20)]">
          <PwaIconPreview context={context} size={96} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">Установить {targetName}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                ARAY_FOCUS_RING,
              )}
              aria-label="Закрыть баннер установки"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-muted/30 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              {getPlatformLabel(platform)}
            </span>
            {!canNativeInstall && (
              <span className="rounded-full border border-border bg-muted/30 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                {manualHint}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {canNativeInstall && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling}
                className={cn(
                  "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60",
                  ARAY_FOCUS_RING,
                )}
              >
                {isInstalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isInstalling ? "Открываю" : "Установить"}
              </button>
            )}
            <button
              type="button"
              onClick={dismissBanner}
              className={cn(
                "inline-flex min-h-9 items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground",
                ARAY_FOCUS_RING,
              )}
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AdminPwaInstallButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedContextId = searchParams.get("app");
  const context = requestedContextId
    ? resolvePwaInstallContextById(requestedContextId)
    : resolvePwaInstallContext(pathname || "/", searchParams);
  const targetName = context.shortName === "ARAY" ? "ARAY" : context.shortName;

  const [platform, setPlatform] = useState<PwaPlatform>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [dismissed, setDismissedState] = useState(true);

  const refreshInstallState = useCallback(() => {
    setPlatform(detectPwaPlatform());
    setInstallPrompt(getStoredPwaInstallPrompt());
    setDismissedState(isHeaderDismissed());
  }, []);

  useEffect(() => {
    refreshInstallState();

    const readyHandler = () => {
      setInstallPrompt(getStoredPwaInstallPrompt());
      setInstallState("idle");
    };
    const installHandler = (event: Event) => {
      rememberPwaInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallState("idle");
      setDismissedState(false);
    };
    const installedHandler = () => {
      clearStoredPwaInstallPrompt();
      setInstallPrompt(null);
      setInstallState("accepted");
      setPlatform("installed");
      setDismissedState(false);
    };

    window.addEventListener("aray:pwa-install-ready", readyHandler);
    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);
    window.addEventListener("aray:pwa-installed", installedHandler);
    return () => {
      window.removeEventListener("aray:pwa-install-ready", readyHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("aray:pwa-installed", installedHandler);
    };
  }, [refreshInstallState]);

  useEffect(() => {
    writePreferredPwaStart(context.id, context.startUrl);
  }, [context.id, context.startUrl]);

  if (platform === null || dismissed) return null;

  const installed = platform === "installed";
  const canNativeInstall = Boolean(installPrompt) && (platform === "android" || platform === "desktop-chrome");
  const isInstalling = installState === "installing";
  const buttonLabel = installed ? "Открыть" : canNativeInstall ? "Установить" : "Установить";
  const title = installed ? `Открыть ${targetName}` : `Установить ${targetName}`;

  const handlePrimary = async () => {
    writePreferredPwaStart(context.id, context.startUrl);

    if (installed) {
      window.open(context.startUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (!installPrompt) {
      window.dispatchEvent(new CustomEvent("aray:pwa-install:open", { detail: { appId: context.id } }));
      return;
    }

    setInstallState("installing");

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      clearStoredPwaInstallPrompt();
      setInstallPrompt(null);

      if (result.outcome === "accepted") {
        setInstallState("accepted");
        setPlatform("installed");
        return;
      }

      setInstallState("dismissed");
    } catch {
      clearStoredPwaInstallPrompt();
      setInstallPrompt(null);
      setInstallState("error");
      window.dispatchEvent(new CustomEvent("aray:pwa-install:open", { detail: { appId: context.id } }));
    }
  };

  const handleDismiss = () => {
    dismissHeaderInstall();
    setDismissedState(true);
  };

  return (
    <div
      className="flex h-10 shrink-0 items-center overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.07] text-primary shadow-sm"
      title={title}
    >
      <button
        type="button"
        onClick={handlePrimary}
        disabled={isInstalling}
        className={cn(
          "inline-flex h-full w-10 items-center justify-center gap-2 text-xs font-semibold transition-colors hover:bg-primary/[0.1] disabled:opacity-60 min-[1320px]:w-auto min-[1320px]:px-3",
          ARAY_FOCUS_RING,
        )}
        aria-label={title}
      >
        {isInstalling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        <span className="hidden min-[1320px]:inline">{isInstalling ? "Открываю" : buttonLabel}</span>
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          "hidden h-full w-8 items-center justify-center border-l border-primary/15 text-primary/70 transition-colors hover:bg-primary/[0.1] hover:text-primary min-[1320px]:flex",
          ARAY_FOCUS_RING,
        )}
        aria-label="Скрыть установку приложения"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
