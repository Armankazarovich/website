"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AccountDrawer = dynamic(
  () => import("@/components/store/account-drawer").then((m) => ({ default: m.AccountDrawer })),
  { ssr: false }
);

const VoiceModeOverlay = dynamic(
  () => import("@/components/store/voice-mode-overlay").then((m) => ({ default: m.VoiceModeOverlay })),
  { ssr: false }
);

const ArayDock = dynamic(
  () => import("@/components/store/aray-dock").then((m) => ({ default: m.ArayDock })),
  { ssr: false }
);

export function AdminDeferredClientTools() {
  const [mounted, setMounted] = useState(false);
  const [pendingArayEvent, setPendingArayEvent] = useState<"open" | "voice" | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 1400);
    const openAray = () => {
      setMounted(true);
      setPendingArayEvent("open");
    };
    const openVoice = () => {
      setMounted(true);
      setPendingArayEvent("voice");
    };

    window.addEventListener("aray:open", openAray);
    window.addEventListener("aray:voice", openVoice);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("aray:open", openAray);
      window.removeEventListener("aray:voice", openVoice);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !pendingArayEvent) return;
    const eventName = pendingArayEvent === "open" ? "aray:open" : "aray:voice";
    const timers = [180, 520, 1000].map((delay) =>
      window.setTimeout(() => window.dispatchEvent(new Event(eventName)), delay)
    );
    const done = window.setTimeout(() => setPendingArayEvent(null), 1200);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [mounted, pendingArayEvent]);

  if (!mounted) return null;

  return (
    <>
      <AccountDrawer />
      <VoiceModeOverlay />
      <ArayDock enabled />
    </>
  );
}
