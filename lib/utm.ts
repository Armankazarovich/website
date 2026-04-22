/**
 * UTM / traffic-source tracking helpers.
 *
 * Strategy: **first-touch attribution**.
 * Когда посетитель впервые попадает на сайт с UTM-метками (или gclid/yclid),
 * мы сохраняем это в localStorage на 90 дней. При оформлении заказа метки
 * прикрепляются к заказу. Если позже он зайдёт с других меток — не перезаписываем
 * (first-touch даёт правдивую картину "какая реклама реально привела клиента").
 *
 * Если клиент не вернулся 90 дней — метка протухает, следующий визит создаст новую first-touch.
 */

export const UTM_STORAGE_KEY = "pilorus_attribution_v1";
export const UTM_TTL_DAYS = 90;

export type Attribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  yclid: string | null;
  referrer: string | null;
  landingPage: string | null;
  firstTouchAt: string; // ISO
};

export function emptyAttribution(): Attribution {
  return {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    gclid: null,
    yclid: null,
    referrer: null,
    landingPage: null,
    firstTouchAt: new Date().toISOString(),
  };
}

/** Читает метки из текущего URL (и document.referrer). Возвращает null если ничего релевантного нет. */
export function parseAttributionFromUrl(
  url: string,
  referrer: string | null,
): Attribution | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const p = parsed.searchParams;
  const utmSource = p.get("utm_source");
  const utmMedium = p.get("utm_medium");
  const utmCampaign = p.get("utm_campaign");
  const utmTerm = p.get("utm_term");
  const utmContent = p.get("utm_content");
  const gclid = p.get("gclid");
  const yclid = p.get("yclid");

  // Если нет ни одной метки И реферер пустой/наш — не создаём attribution.
  const hasAny = utmSource || utmMedium || utmCampaign || gclid || yclid;
  const refIsExternal = referrer && !isInternalReferrer(referrer, parsed.hostname);
  if (!hasAny && !refIsExternal) return null;

  return {
    utmSource: utmSource ?? inferSourceFromReferrer(referrer),
    utmMedium: utmMedium ?? inferMediumFromReferrer(referrer, !!(gclid || yclid)),
    utmCampaign: utmCampaign ?? null,
    utmTerm: utmTerm ?? null,
    utmContent: utmContent ?? null,
    gclid: gclid ?? null,
    yclid: yclid ?? null,
    referrer: referrer ?? null,
    landingPage: parsed.pathname + parsed.search,
    firstTouchAt: new Date().toISOString(),
  };
}

function isInternalReferrer(referrer: string, currentHost: string): boolean {
  try {
    const r = new URL(referrer);
    return r.hostname === currentHost;
  } catch {
    return true;
  }
}

function inferSourceFromReferrer(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("yandex")) return "yandex";
    if (host.includes("google")) return "google";
    if (host.includes("mail.ru") || host.includes("go.mail.ru")) return "mail";
    if (host.includes("bing")) return "bing";
    if (host.includes("duckduckgo")) return "duckduckgo";
    if (host.includes("vk.com") || host.includes("vk.ru")) return "vk";
    if (host.includes("t.me") || host.includes("telegram")) return "telegram";
    if (host.includes("whatsapp") || host.includes("wa.me")) return "whatsapp";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook")) return "facebook";
    if (host.includes("avito")) return "avito";
    if (host.includes("ok.ru") || host.includes("odnoklassniki")) return "ok";
    if (host.includes("2gis")) return "2gis";
    if (host.includes("dzen")) return "dzen";
    return host;
  } catch {
    return null;
  }
}

function inferMediumFromReferrer(
  referrer: string | null,
  hasClickId: boolean,
): string | null {
  if (hasClickId) return "cpc";
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (/(yandex|google|bing|mail|duckduckgo|dzen)/.test(host)) return "organic";
    if (/(vk|t\.me|telegram|whatsapp|wa\.me|instagram|facebook|ok\.ru|odnoklassniki)/.test(host)) return "social";
    if (/(avito|2gis)/.test(host)) return "referral";
    return "referral";
  } catch {
    return null;
  }
}

// ── Browser storage ──────────────────────────────────────────────────────

/** Пишет first-touch в localStorage если там ещё нет свежей записи. */
export function saveFirstTouch(attribution: Attribution): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAttribution();
    if (existing) return; // first-touch lock — не перезаписываем
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // localStorage может быть отключён (Safari private)
  }
}

/** Читает attribution из localStorage. Если старше TTL — удаляет и возвращает null. */
export function loadAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    const ts = new Date(parsed.firstTouchAt).getTime();
    const ageMs = Date.now() - ts;
    const ttlMs = UTM_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs > ttlMs) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(UTM_STORAGE_KEY);
  } catch {}
}

// ── Human-readable display ───────────────────────────────────────────────

export type SourceGroup =
  | "direct_ad" // Яндекс.Директ
  | "google_ads"
  | "organic"
  | "social"
  | "referral"
  | "direct"
  | "other";

export function classifySource(attr: Partial<Attribution> | null | undefined): SourceGroup {
  if (!attr) return "direct";
  if (attr.yclid || attr.utmSource === "yandex_direct" || attr.utmSource === "direct") return "direct_ad";
  if (attr.gclid || attr.utmSource === "google_ads" || attr.utmSource === "googleads") return "google_ads";
  const medium = (attr.utmMedium || "").toLowerCase();
  const source = (attr.utmSource || "").toLowerCase();
  if (medium === "cpc" || medium === "paid") {
    if (source.includes("yandex")) return "direct_ad";
    if (source.includes("google")) return "google_ads";
    return "other";
  }
  if (medium === "organic") return "organic";
  if (medium === "social") return "social";
  if (medium === "referral") return "referral";
  if (!attr.utmSource && !attr.utmMedium && !attr.referrer) return "direct";
  return "other";
}

export function humanizeSource(group: SourceGroup): { label: string; color: string } {
  switch (group) {
    case "direct_ad":
      return { label: "Яндекс.Директ", color: "text-red-500" };
    case "google_ads":
      return { label: "Google Ads", color: "text-blue-500" };
    case "organic":
      return { label: "Поиск", color: "text-emerald-500" };
    case "social":
      return { label: "Соцсети", color: "text-violet-500" };
    case "referral":
      return { label: "Переход", color: "text-amber-500" };
    case "direct":
      return { label: "Прямой", color: "text-muted-foreground" };
    default:
      return { label: "Другое", color: "text-muted-foreground" };
  }
}

export function humanizeAttribution(attr: Partial<Attribution> | null | undefined): string {
  const group = classifySource(attr);
  const base = humanizeSource(group).label;
  if (attr?.utmCampaign) return `${base} · ${attr.utmCampaign}`;
  if (attr?.utmSource && group === "other") return `${base} · ${attr.utmSource}`;
  return base;
}
