"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArayDock } from "@/components/store/aray-dock";
import type { AdminArayNavigationContext } from "@/components/admin/admin-aray-navigation";

type ArayPendingWindow = Window & {
  __arayPendingOpen?: "open" | "voice";
  __arayPendingPrompt?: {
    text: string;
    displayText?: string;
    context?: string;
    actions?: Array<{
      type: "navigate" | "spotlight" | "highlight" | "call" | "prompt";
      url?: string;
      label: string;
      prompt?: string;
      icon?: string;
      hint?: string;
      spotX?: number;
      spotY?: number;
    }>;
    openUrl?: string;
    openTitle?: string;
  };
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function loadArayWidget() {
  return import("@/components/store/aray-widget").then((module) => ({
    default: module.ArayWidget,
  }));
}

const LazyArayWidget = dynamic(
  loadArayWidget,
  { loading: () => null, ssr: false },
);

interface ArayGlobalAssistantProps {
  enabled?: boolean;
  page?: string;
  staffName?: string | null;
  userRole?: string;
  adminNavigation?: AdminArayNavigationContext;
}

export function ArayGlobalAssistant({
  enabled = true,
  page,
  staffName,
  userRole,
  adminNavigation,
}: ArayGlobalAssistantProps) {
  const [widgetMounted, setWidgetMounted] = useState(false);
  const widgetMountedRef = useRef(false);
  const replayingRef = useRef(false);

  useEffect(() => {
    widgetMountedRef.current = widgetMounted;
  }, [widgetMounted]);

  useEffect(() => {
    const pendingWindow = window as ArayPendingWindow;
    if ((pendingWindow.__arayPendingOpen || pendingWindow.__arayPendingPrompt) && !widgetMountedRef.current) {
      widgetMountedRef.current = true;
      setWidgetMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const pendingWindow = window as ArayPendingWindow;
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const preload = () => {
      if (cancelled || widgetMountedRef.current) return;
      void loadArayWidget();
    };

    if (typeof pendingWindow.requestIdleCallback === "function") {
      idleId = pendingWindow.requestIdleCallback(preload, { timeout: 2200 });
    } else {
      timeoutId = window.setTimeout(preload, 1600);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof pendingWindow.cancelIdleCallback === "function") {
        pendingWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [enabled]);

  useEffect(() => {
    const bootAndReplay = (event: Event) => {
      if (replayingRef.current) return;
      const needsBoot = !widgetMountedRef.current;
      if (!needsBoot) return;

      const pendingWindow = window as ArayPendingWindow;
      pendingWindow.__arayPendingOpen = event.type === "aray:voice" ? "voice" : "open";
      if (
        event.type === "aray:prompt" &&
        event instanceof CustomEvent &&
        typeof event.detail?.text === "string"
      ) {
        const text = event.detail.text.trim();
        if (text) {
          pendingWindow.__arayPendingPrompt = { ...event.detail, text };
        }
      }

      void loadArayWidget();
      widgetMountedRef.current = true;
      setWidgetMounted(true);
    };

    window.addEventListener("aray:open", bootAndReplay);
    window.addEventListener("aray:voice", bootAndReplay);
    window.addEventListener("aray:prompt", bootAndReplay);
    return () => {
      window.removeEventListener("aray:open", bootAndReplay);
      window.removeEventListener("aray:voice", bootAndReplay);
      window.removeEventListener("aray:prompt", bootAndReplay);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <ArayDock enabled={enabled} />
      {widgetMounted && (
        <LazyArayWidget
          enabled={enabled}
          page={page}
          staffName={staffName ?? undefined}
          userRole={userRole}
          adminNavigation={adminNavigation}
        />
      )}
    </>
  );
}
