import "server-only";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function normalizeOrigin(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

function requestOrigin(req: Request) {
  const requestUrl = new URL(req.url);
  return {
    origin: `${requestUrl.protocol}//${requestUrl.host}`,
    isLocal: isLocalHost(requestUrl.hostname),
  };
}

function publicSiteOrigin() {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.NEXTAUTH_URL) ||
    normalizeOrigin(process.env.AUTH_URL)
  );
}

export function yandexOAuthCallbackUri(
  req: Request,
  envKey: string,
  callbackPath: string,
) {
  const request = requestOrigin(req);
  const fallbackOrigin = request.isLocal
    ? request.origin
    : publicSiteOrigin() || request.origin;
  const fallback = new URL(callbackPath, fallbackOrigin).toString();
  const configured = String(process.env[envKey] || "").trim();

  if (!configured) return fallback;

  try {
    const configuredUrl = new URL(configured);
    const fallbackUrl = new URL(fallback);
    if (
      isLocalHost(configuredUrl.hostname) &&
      configuredUrl.host !== fallbackUrl.host
    ) {
      return fallback;
    }
    return configuredUrl.toString();
  } catch {
    return fallback;
  }
}
