import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// TENANT DETECTION (подготовка к multi-tenancy, Этап 3)
// ═══════════════════════════════════════════════════════════════════════════
// Определяет тенант по hostname и проставляет x-tenant-id header.
// Пока только информационный — реально разделять данные будем в Этапе 3.
//
// Правила:
//   pilo-rus.ru, www.pilo-rus.ru, localhost → "pilorus" (дефолт)
//   <slug>.pilo-rus.ru                       → "<slug>" (будущие поставщики)
//   *.custom-domain.tld                       → резолвится через БД (Этап 3)
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_TENANT = "pilorus";
const ROOT_DOMAIN = "pilo-rus.ru";
const ACTIVE_ADMIN_SITE_COOKIE = "aray-active-site";
const KNOWN_TENANT_DOMAINS: Array<{ tenantId: string; domains: string[] }> = [];

function normalizeHostname(value: string): string {
  return value
    .split(":")[0]
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function domainMatches(hostname: string, domain: string): boolean {
  const clean = normalizeHostname(domain);
  if (!clean) return false;
  return hostname === clean || hostname === `www.${clean}` || `www.${hostname}` === clean;
}

function tenantFromDomainMap(hostname: string): string | null {
  for (const item of KNOWN_TENANT_DOMAINS) {
    if (item.domains.some((domain) => domainMatches(hostname, domain))) {
      return item.tenantId;
    }
  }

  const raw = process.env.TENANT_DOMAIN_MAP || process.env.NEXT_PUBLIC_TENANT_DOMAIN_MAP || "";
  if (!raw.trim()) return null;

  for (const entry of raw.split(/[;\n]+/g)) {
    const [slugRaw, domainsRaw] = entry.split("=");
    const slug = (slugRaw || "").trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(slug) || !domainsRaw) continue;

    const domains = domainsRaw
      .split(/[,|]+/g)
      .map((item) => item.trim())
      .filter(Boolean);

    if (domains.some((domain) => domainMatches(hostname, domain))) {
      return slug;
    }
  }

  return null;
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.")
  );
}

function previewTenantFromQuery(request: NextRequest, hostname: string): string | null {
  const enabled = isLocalHostname(hostname) || process.env.ARAY_ENABLE_PUBLIC_TENANT_PREVIEW === "1";
  if (!enabled) return null;

  const value = (
    request.nextUrl.searchParams.get("tenantPreview") ||
    request.nextUrl.searchParams.get("arayTenant") ||
    ""
  ).trim().toLowerCase();
  return /^[a-z0-9-]{2,40}$/.test(value) ? value : null;
}

function detectTenant(host: string): string {
  if (!host) return DEFAULT_TENANT;
  const hostname = normalizeHostname(host);

  // Dev / localhost / IP
  if (isLocalHostname(hostname)) {
    return DEFAULT_TENANT;
  }

  // Apex или www → дефолтный тенант
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return DEFAULT_TENANT;
  }

  // <slug>.pilo-rus.ru → slug как tenant
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -ROOT_DOMAIN.length - 1);
    // Валидный slug: буквы/цифры/дефис, 2-40 символов
    if (/^[a-z0-9-]{2,40}$/.test(slug) && slug !== "www") {
      return slug;
    }
    return DEFAULT_TENANT;
  }

  // Custom domain (в будущем будет lookup в БД). Пока — дефолт.
  const mappedTenant = tenantFromDomainMap(hostname);
  if (mappedTenant) return mappedTenant;

  return DEFAULT_TENANT;
}

function activeAdminTenant(request: NextRequest): string | null {
  const value = request.cookies.get(ACTIVE_ADMIN_SITE_COOKIE)?.value?.trim().toLowerCase();
  if (!value || !/^[a-z0-9-]{2,40}$/.test(value)) return null;

  const configuredTenants = process.env.ARAY_ADMIN_TENANTS?.trim();

  // If the network list is not locked by env, ARAY can work with newly created
  // draft tenants immediately. Production can still pin the allowed list through
  // ARAY_ADMIN_TENANTS.
  if (!configuredTenants) return value;

  const allowed = configuredTenants
    .split(/[,;\s]+/g)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(value) ? value : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// REDIRECT CACHE (слияние категорий)
// ═══════════════════════════════════════════════════════════════════════════
const CATEGORY_REDIRECTS = new Map<string, { toSlug: string | null; permanent: boolean }>([
  ["dsp-mdf-osb-csp", { toSlug: "dsp-mdf-osb", permanent: true }],
  ["dsp-dvp-mdf-tssp-osb", { toSlug: "dsp-mdf-osb", permanent: true }],
  ["dsp-dvp-mdf-csp-osb", { toSlug: "dsp-mdf-osb", permanent: true }],
  ["dsp-dvp-mdf-osb-csp", { toSlug: "dsp-mdf-osb", permanent: true }],
  ["fanera-i-listovye-materialy", { toSlug: "fanera", permanent: true }],
  ["fanera-listovye-materialy", { toSlug: "fanera", permanent: true }],
  ["sosna-i-el", { toSlug: "sosna-el", permanent: true }],
  ["sosna-elka", { toSlug: "sosna-el", permanent: true }],
  ["listvennica", { toSlug: "listvennitsa", permanent: true }],
  ["lipa-i-osina", { toSlug: "lipa-osina", permanent: true }],
]);

const PRODUCT_REDIRECTS = new Map<string, { toSlug: string; permanent: boolean }>([
  ["doska-obreznaya-1sort-sosna", { toSlug: "doska-obreznaya-iz-sosny-i-eli-gost", permanent: true }],
  ["doska-obreznaya-1-sort-sosna", { toSlug: "doska-obreznaya-iz-sosny-i-eli-gost", permanent: true }],
  ["doska-obreznaya-2sort-sosna", { toSlug: "doska-obreznaya-iz-sosny-i-eli", permanent: true }],
  ["doska-obreznaya-2-sort-sosna", { toSlug: "doska-obreznaya-iz-sosny-i-eli", permanent: true }],
  ["doska-obreznaya-suhaya-sosna", { toSlug: "doska-obreznaya-iz-sosny-i-eli", permanent: true }],
  ["doska-obreznaya-tu-osina", { toSlug: "doska-obreznaya-iz-osiny", permanent: true }],
  ["doska-obreznaya-osina", { toSlug: "doska-obreznaya-iz-osiny", permanent: true }],
  ["doska-obreznaya-1sort-listv", { toSlug: "doska-obreznaya-iz-listvennitsy-gost", permanent: true }],
  ["doska-obreznaya-1-sort-listv", { toSlug: "doska-obreznaya-iz-listvennitsy-gost", permanent: true }],
  ["doska-obreznaya-suhaya-listv", { toSlug: "doska-obreznaya-iz-listvennitsy", permanent: true }],
  ["doska-obreznaya-kedr", { toSlug: "doska-obreznaya-iz-kedra", permanent: true }],
  ["doska-obreznaya-suhaya-kedr", { toSlug: "doska-obreznaya-iz-kedra", permanent: true }],
]);

function getRedirects(): Map<string, { toSlug: string | null; permanent: boolean }> {
  return CATEGORY_REDIRECTS;
}

function normalizeCatalogSlug(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value)
      .trim()
      .toLowerCase()
      .replace(/\/+$/g, "");
  } catch {
    return value.trim().toLowerCase().replace(/\/+$/g, "");
  }
}

function catalogRedirectResponse(request: NextRequest, slug: string | null | undefined) {
  const match = getRedirects().get(normalizeCatalogSlug(slug));
  if (!match) return null;

  const destination = match.toSlug ? `/catalog?category=${match.toSlug}` : "/catalog";
  return NextResponse.redirect(new URL(destination, request.url), {
    status: match.permanent ? 301 : 302,
  });
}

function productRedirectResponse(request: NextRequest, slug: string | null | undefined) {
  const match = PRODUCT_REDIRECTS.get(normalizeCatalogSlug(slug));
  if (!match) return null;

  return NextResponse.redirect(new URL(`/product/${match.toSlug}`, request.url), {
    status: match.permanent ? 301 : 302,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = normalizeHostname(host);
  const fromHost = detectTenant(host);
  const adminWorkspace =
    url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin");
  const apiRoute = url.pathname.startsWith("/api");
  const previewTenant = previewTenantFromQuery(request, hostname);
  const tenantId = adminWorkspace
    ? activeAdminTenant(request) || fromHost
    : previewTenant || fromHost;

  // 1. Redirect для переименованных категорий (существующая логика)
  if (url.pathname === "/catalog") {
    const categorySlug = url.searchParams.get("category");
    const redirect = catalogRedirectResponse(request, categorySlug);
    if (redirect) return redirect;
  }

  const legacyCategoryRoots = new Set(["catalog", "category", "product-category", "shop"]);
  const legacyParts = url.pathname.split("/").filter(Boolean);
  if (legacyParts.length === 2 && legacyCategoryRoots.has(legacyParts[0])) {
    const redirect = catalogRedirectResponse(request, legacyParts[1]);
    if (redirect) return redirect;
  }

  if (legacyParts.length === 2 && legacyParts[0] === "product") {
    const redirect = productRedirectResponse(request, legacyParts[1]);
    if (redirect) return redirect;
  }

  // 2. Keep request header overrides only for tenant-aware paths. Public default
  // storefront pages use DEFAULT_TENANT_ID directly, which preserves ISR caching.
  const needsTenantRequestHeader =
    adminWorkspace || apiRoute || Boolean(previewTenant) || tenantId !== DEFAULT_TENANT;
  const cacheablePublicStorefront =
    !needsTenantRequestHeader &&
    ((url.pathname === "/catalog" && !url.searchParams.has("search")) ||
      url.pathname.startsWith("/product/"));
  const response = needsTenantRequestHeader
    ? NextResponse.next({
        request: {
          headers: (() => {
            const h = new Headers(request.headers);
            h.set("x-tenant-id", tenantId);
            return h;
          })(),
        },
      })
    : NextResponse.next();

  // Response header для дебага и аналитики
  response.headers.set("x-tenant-id", tenantId);
  if (cacheablePublicStorefront) {
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  }

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHER
// ═══════════════════════════════════════════════════════════════════════════
// Применяется ко всем запросам, кроме статики и Next.js internals.
// Это безопасно — middleware работает за микросекунды и не трогает БД.
export const config = {
  matcher: [
    /*
     * Matcher применяется ко всем путям, кроме:
     * - _next/static (статические файлы)
     * - _next/image (оптимизированные картинки)
     * - favicon.ico, robots.txt, sitemap.xml, manifest.json
     * - /uploads/ (пользовательские файлы)
     * - /images/ (статика проекта)
     * - /fonts/ (шрифты)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|uploads|images|fonts).*)",
  ],
};
