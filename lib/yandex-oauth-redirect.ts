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

function originIsLocal(origin: string) {
  try {
    return isLocalHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function firstHeaderValue(value?: string | null) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function forwardedOrigin(req: Request) {
  const requestUrl = new URL(req.url);
  const proto =
    firstHeaderValue(req.headers.get("x-forwarded-proto")) ||
    firstHeaderValue(req.headers.get("x-forwarded-protocol")) ||
    firstHeaderValue(req.headers.get("x-url-scheme")) ||
    requestUrl.protocol.replace(/:$/, "");
  const host =
    firstHeaderValue(req.headers.get("x-forwarded-host")) ||
    firstHeaderValue(req.headers.get("x-original-host")) ||
    firstHeaderValue(req.headers.get("host"));

  return normalizeOrigin(host ? `${proto}://${host}` : "");
}

function requestOrigin(req: Request) {
  const requestUrl = new URL(req.url);
  const directOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
  const forwarded = forwardedOrigin(req);
  const publicOrigin = publicSiteOrigin({ allowLocal: false });
  const origin = !originIsLocal(forwarded)
    ? forwarded
    : !originIsLocal(directOrigin)
      ? directOrigin
      : process.env.NODE_ENV === "production" && publicOrigin
        ? publicOrigin
        : directOrigin;

  return {
    origin,
    isLocal: originIsLocal(origin),
  };
}

function publicSiteOrigin({ allowLocal = false }: { allowLocal?: boolean } = {}) {
  const candidates = [
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    normalizeOrigin(process.env.NEXTAUTH_URL),
    normalizeOrigin(process.env.AUTH_URL),
  ];

  return (
    candidates.find((origin) => origin && (allowLocal || !originIsLocal(origin))) ||
    ""
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
    : publicSiteOrigin({ allowLocal: false }) || request.origin;
  const fallback = new URL(callbackPath, fallbackOrigin).toString();
  const configured = String(process.env[envKey] || "").trim();

  if (!configured) return fallback;

  try {
    const configuredUrl = new URL(configured);
    const fallbackUrl = new URL(fallback);
    const configuredIsLocal = isLocalHost(configuredUrl.hostname);
    if (
      configuredIsLocal &&
      (process.env.NODE_ENV === "production" ||
        !request.isLocal ||
        configuredUrl.host !== fallbackUrl.host)
    ) {
      return fallback;
    }
    return configuredUrl.toString();
  } catch {
    return fallback;
  }
}
