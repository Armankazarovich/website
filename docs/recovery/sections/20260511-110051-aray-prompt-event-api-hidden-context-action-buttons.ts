"use client";

export type ArayOpenMode = "open" | "voice";

type ArayPendingWindow = Window & {
  __arayPendingOpen?: ArayOpenMode;
  __arayPendingPrompt?: { text: string };
};

function getPendingWindow(): ArayPendingWindow | null {
  if (typeof window === "undefined") return null;
  return window as ArayPendingWindow;
}

function clearAdminNavigationCapsule() {
  if (typeof document === "undefined") return;
  document.body.removeAttribute("data-admin-nav-capsule");
  delete document.body.dataset.adminNavCapsule;
}

export function requestArayOpen(mode: ArayOpenMode = "open") {
  const pendingWindow = getPendingWindow();
  if (!pendingWindow) return;

  pendingWindow.__arayPendingOpen = mode;
  clearAdminNavigationCapsule();
  window.dispatchEvent(new CustomEvent("aray:ensure-mounted", { detail: { mode } }));
  window.dispatchEvent(new Event(mode === "voice" ? "aray:voice" : "aray:open"));
}

export function requestArayClose() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("aray:close"));
}

export function requestArayPrompt(text: string, delayMs = 260) {
  const clean = text.trim();
  const pendingWindow = getPendingWindow();
  if (!clean || !pendingWindow) return;

  pendingWindow.__arayPendingPrompt = { text: clean };
  requestArayOpen("open");
  window.setTimeout(() => {
    const pending = pendingWindow.__arayPendingPrompt;
    if (!pending || pending.text !== clean) return;
    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: { text: clean } }));
    window.setTimeout(() => {
      const stillPending = pendingWindow.__arayPendingPrompt;
      if (stillPending?.text === clean) delete pendingWindow.__arayPendingPrompt;
    }, 2500);
  }, delayMs);
}
