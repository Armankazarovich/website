import "server-only";

type DirectPublicUrlSettings = Record<string, string | undefined>;

type DirectPublicUrlTenant = {
  domain?: string | null;
};

function settingValue(settings: DirectPublicUrlSettings, keys: string[]) {
  for (const key of keys) {
    const value = settings[key]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizeOrigin(value: string) {
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isLocalOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return true;
  }
}

export function resolveDirectPublicBaseUrl({
  settings,
  tenant,
  requestUrl,
}: {
  settings: DirectPublicUrlSettings;
  tenant?: DirectPublicUrlTenant | null;
  requestUrl: string | URL;
}) {
  const request = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  const candidates = [
    settingValue(settings, ["yandex_direct_public_url", "direct_public_url", "public_site_url", "site_url", "canonical_url"]),
    tenant?.domain || "",
    `${request.protocol}//${request.host}`,
    process.env.NEXT_PUBLIC_SITE_URL || "",
    process.env.NEXTAUTH_URL || "",
  ];

  for (const candidate of candidates) {
    const origin = normalizeOrigin(candidate);
    if (origin && !isLocalOrigin(origin)) {
      return { baseUrl: origin, isPublic: true };
    }
  }

  return {
    baseUrl: `${request.protocol}//${request.host}`,
    isPublic: false,
  };
}
