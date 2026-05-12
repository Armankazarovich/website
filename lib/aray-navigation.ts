export const ARAY_EXTERNAL_TAB_ONLY_HOSTS = [
  "yandex.ru",
  "ya.ru",
  "google.com",
  "google.ru",
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

export function isAdminPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`) || pathname.startsWith(`${basePath}?`);
}
