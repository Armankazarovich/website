"use client";

import { useEffect } from "react";

const LIVE_OVERLAY_SELECTOR = [
  ".admin-side-panel-root",
  ".admin-modal-panel",
  ".admin-mobile-sheet",
  ".account-drawer-panel",
  "[data-radix-dialog-content]",
  '[role="dialog"][aria-modal="true"]',
].join(", ");

function hasLiveOverlay() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(LIVE_OVERLAY_SELECTOR));
}

export function resetAdminOverlayLock(force = false) {
  if (typeof document === "undefined") return;
  if (!force && hasLiveOverlay()) return;

  const body = document.body;
  const documentElement = document.documentElement;
  const previousOverflow = body.dataset.adminOverlayPreviousOverflow;
  const previousOverscroll = body.dataset.adminOverlayPreviousOverscroll;

  delete body.dataset.adminOverlayCount;
  delete body.dataset.adminOverlayOpen;
  delete body.dataset.adminOverlayPreviousOverflow;
  delete body.dataset.adminOverlayPreviousOverscroll;
  body.style.overflow = previousOverflow ?? "";
  documentElement.style.overscrollBehaviorY = previousOverscroll ?? "";
}

export function useAdminOverlayRecovery(key: unknown) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const recoverSoon = () => window.setTimeout(() => resetAdminOverlayLock(false), 80);

    recoverSoon();
    window.addEventListener("pageshow", recoverSoon);
    window.addEventListener("popstate", recoverSoon);
    return () => {
      window.removeEventListener("pageshow", recoverSoon);
      window.removeEventListener("popstate", recoverSoon);
    };
  }, [key]);
}

/**
 * Shared overlay flag for admin/mobile chrome.
 * Any real modal/drawer can set this so sticky docks and launchers step away.
 */
export function useAdminOverlayGuard(open: boolean) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const body = document.body;
    const documentElement = document.documentElement;
    const currentOverlayCount = Number(body.dataset.adminOverlayCount || "0");
    if (currentOverlayCount === 0) {
      body.dataset.adminOverlayPreviousOverflow = body.style.overflow;
      body.dataset.adminOverlayPreviousOverscroll = documentElement.style.overscrollBehaviorY;
      body.style.overflow = "hidden";
      documentElement.style.overscrollBehaviorY = "none";
    }
    body.dataset.adminOverlayCount = String(currentOverlayCount + 1);
    body.dataset.adminOverlayOpen = "true";

    return () => {
      const nextOverlayCount = Math.max(0, Number(body.dataset.adminOverlayCount || "1") - 1);
      if (nextOverlayCount > 0) {
        body.dataset.adminOverlayCount = String(nextOverlayCount);
      } else {
        delete body.dataset.adminOverlayCount;
        delete body.dataset.adminOverlayOpen;
        body.style.overflow = body.dataset.adminOverlayPreviousOverflow || "";
        documentElement.style.overscrollBehaviorY = body.dataset.adminOverlayPreviousOverscroll || "";
        delete body.dataset.adminOverlayPreviousOverflow;
        delete body.dataset.adminOverlayPreviousOverscroll;
      }
    };
  }, [open]);
}
