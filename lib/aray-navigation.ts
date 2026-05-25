export const ARAY_EXTERNAL_TAB_ONLY_HOSTS = [
  "yandex.ru",
  "ya.ru",
  "google.com",
  "google.ru",
  "telegram.org",
  "whatsapp.com",
  "zangi.com",
  "max.ru",
  "vk.com",
  "gosuslugi.ru",
  "nalog.ru",
  "sberbank.ru",
  "tinkoff.ru",
  "alfabank.ru",
  "vtb.ru",
  "wildberries.ru",
  "ozon.ru",
  "avito.ru",
] as const;

export function isArayExternalTabOnly(rawUrl: string): boolean {
  try {
    if (!/^https?:\/\//i.test(rawUrl)) return false;
    const host = new URL(rawUrl).hostname.toLowerCase();
    return ARAY_EXTERNAL_TAB_ONLY_HOSTS.some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`) || host.includes(blocked),
    );
  } catch {
    return false;
  }
}

export function openArayExternalPopup(rawUrl: string, name = "aray-external-channel"): Window | null {
  if (typeof window === "undefined") return null;

  try {
    const screenWidth = window.screen?.availWidth || window.innerWidth || 1200;
    const screenHeight = window.screen?.availHeight || window.innerHeight || 820;
    const width = Math.min(980, Math.max(760, Math.floor(screenWidth * 0.62)));
    const height = Math.min(760, Math.max(620, Math.floor(screenHeight * 0.78)));
    const left = Math.max(0, Math.floor((screenWidth - width) / 2));
    const top = Math.max(0, Math.floor((screenHeight - height) / 2));
    const host = new URL(rawUrl).hostname.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "channel";
    const features = [
      "popup=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "resizable=yes",
      "scrollbars=yes",
      "status=no",
      "toolbar=no",
      "menubar=no",
      "location=yes",
    ].join(",");

    const opened = window.open(rawUrl, `${name}-${host}`, features);
    if (!opened) return window.open(rawUrl, "_blank", "noopener,noreferrer");
    try { opened.opener = null; } catch {}
    try { opened.focus(); } catch {}
    return opened;
  } catch {
    return window.open(rawUrl, "_blank", "noopener,noreferrer");
  }
}

export function isAdminPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`) || pathname.startsWith(`${basePath}?`);
}
