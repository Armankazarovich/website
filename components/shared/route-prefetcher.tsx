"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface RoutePrefetcherProps {
  hrefs: Array<string | null | undefined>;
  delayMs?: number;
  limit?: number;
}

export function RoutePrefetcher({
  hrefs,
  delayMs = 650,
  limit = 10,
}: RoutePrefetcherProps) {
  const router = useRouter();
  const hrefsKey = hrefs.filter(Boolean).join("|");

  useEffect(() => {
    if (!hrefsKey) return;

    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) {
      return;
    }

    const win = window as IdleWindow;
    const uniqueHrefs = Array.from(new Set(hrefsKey.split("|").filter(Boolean))).slice(0, limit);
    let cancelled = false;
    let startTimer: number | undefined;
    let idleId: number | undefined;
    const staggerTimers: number[] = [];

    const prefetch = () => {
      uniqueHrefs.forEach((href, index) => {
        const timer = window.setTimeout(() => {
          if (!cancelled) router.prefetch(href);
        }, index * 90);
        staggerTimers.push(timer);
      });
    };

    startTimer = window.setTimeout(() => {
      if (win.requestIdleCallback) {
        idleId = win.requestIdleCallback(prefetch, { timeout: 1200 });
      } else {
        prefetch();
      }
    }, delayMs);

    return () => {
      cancelled = true;
      if (startTimer) window.clearTimeout(startTimer);
      if (idleId !== undefined && win.cancelIdleCallback) win.cancelIdleCallback(idleId);
      staggerTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [delayMs, hrefsKey, limit, router]);

  return null;
}
