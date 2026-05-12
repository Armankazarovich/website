export type PwaPlatform =
  | "ios-safari"
  | "ios-other"
  | "android"
  | "desktop-chrome"
  | "desktop-other"
  | "installed"
  | null;

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallWindow = Window & {
  __arayBeforeInstallPrompt?: BeforeInstallPromptEvent;
};

export function rememberPwaInstallPrompt(event: BeforeInstallPromptEvent) {
  event.preventDefault();
  (window as PwaInstallWindow).__arayBeforeInstallPrompt = event;
  window.dispatchEvent(new Event("aray:pwa-install-ready"));
}

export function getStoredPwaInstallPrompt() {
  if (typeof window === "undefined") return null;
  return (window as PwaInstallWindow).__arayBeforeInstallPrompt ?? null;
}

export function clearStoredPwaInstallPrompt() {
  if (typeof window === "undefined") return;
  delete (window as PwaInstallWindow).__arayBeforeInstallPrompt;
}

export function detectPwaPlatform(): PwaPlatform {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return "installed";

  const ua = nav.userAgent;
  const isIPadOS = nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
  const isIOS = (/iPad|iPhone|iPod/.test(ua) || isIPadOS) && !(window as { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  const isChrome = /Chrome|CriOS|Edg|OPR/.test(ua);

  if (isIOS && isSafari) return "ios-safari";
  if (isIOS) return "ios-other";
  if (isAndroid) return "android";
  if (isChrome) return "desktop-chrome";
  return "desktop-other";
}

export function writePreferredPwaStart(contextId: string, startUrl: string) {
  try {
    localStorage.setItem("aray-pwa-preferred-context", contextId);
    localStorage.setItem("aray-pwa-preferred-start", startUrl);
  } catch {
    // Installation still works when storage is blocked.
  }
}
