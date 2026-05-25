"use client";

export type ArayOpenMode = "open" | "voice" | "phone";

export type ArayPromptAction = {
  type: "navigate" | "spotlight" | "highlight" | "call";
  url?: string;
  label: string;
  icon?: string;
  hint?: string;
  spotX?: number;
  spotY?: number;
};

export type ArayPromptPayload = {
  text: string;
  displayText?: string;
  localReply?: string;
  context?: string;
  actions?: ArayPromptAction[];
  openUrl?: string;
  openTitle?: string;
};

type ArayPendingWindow = Window & {
  __arayPendingOpen?: ArayOpenMode;
  __arayPendingPrompt?: ArayPromptPayload;
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
  window.dispatchEvent(new CustomEvent(mode === "voice" ? "aray:voice" : "aray:open", { detail: { mode } }));
}

export function requestArayClose() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("aray:close"));
}

export function requestArayPrompt(input: string | ArayPromptPayload, delayMs = 260) {
  const payload =
    typeof input === "string" ? { text: input } : input;
  const clean = payload.text.trim();
  const pendingWindow = getPendingWindow();
  if (!clean || !pendingWindow) return;

  const nextPayload = { ...payload, text: clean };
  pendingWindow.__arayPendingPrompt = nextPayload;
  requestArayOpen("open");
  window.setTimeout(() => {
    const pending = pendingWindow.__arayPendingPrompt;
    if (!pending || pending.text !== clean) return;
    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: nextPayload }));
    window.setTimeout(() => {
      const stillPending = pendingWindow.__arayPendingPrompt;
      if (stillPending?.text === clean) delete pendingWindow.__arayPendingPrompt;
    }, 2500);
  }, delayMs);
}
