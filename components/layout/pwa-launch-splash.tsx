"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPwaIconSrc, resolvePwaInstallContext } from "@/lib/pwa-install-context";

const SPLASH_SESSION_KEY = "pilorus:pwa-launch-splash:v1";

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function PwaLaunchSplash() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = resolvePwaInstallContext(pathname || "/", searchParams);
  const iconSrc = getPwaIconSrc(context, 192);
  const splashSessionKey = `${SPLASH_SESSION_KEY}:${context.id}`;
  const subtitle = context.iconKind === "aray"
    ? "бизнес-платформа"
    : context.id.includes("catalog")
      ? "каталог"
      : "приложение магазина";

  useEffect(() => {
    if (!isStandaloneApp()) return;

    try {
      if (window.sessionStorage.getItem(splashSessionKey) === "1") return;
      window.sessionStorage.setItem(splashSessionKey, "1");
    } catch {
      // The launch screen is decorative; storage failures should not block the app.
    }

    setVisible(true);
    const hideTimer = window.setTimeout(() => setVisible(false), 1150);
    return () => window.clearTimeout(hideTimer);
  }, [splashSessionKey]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_hsl(var(--primary)/0.18)]">
          <span className="absolute inset-3 rounded-[1.5rem] border border-primary/18" />
          <img
            src={iconSrc}
            alt={context.shortName}
            className="h-20 w-20 drop-shadow-[0_12px_28px_hsl(var(--primary)/0.22)]"
          />
        </div>
        <div className="text-center">
          <p className="font-display text-2xl font-bold leading-none">{context.shortName}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
