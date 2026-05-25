"use client";

import { useEffect, useState } from "react";

export function useGlobalOverlayOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => {
      setOpen(document.body.dataset.adminOverlayOpen === "true");
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-admin-overlay-open"],
    });
    return () => observer.disconnect();
  }, []);

  return open;
}

export function useKeyboardOpen(threshold = 100) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const sync = () => setOpen(window.innerHeight - viewport.height > threshold);

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [threshold]);

  return open;
}

export function useFloatingChromeHidden() {
  const overlayOpen = useGlobalOverlayOpen();
  const keyboardOpen = useKeyboardOpen();

  return overlayOpen || keyboardOpen;
}
