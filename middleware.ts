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

function detectTenant(host: string): string {
  if (!host) return DEFAULT_TENANT;
  const hostname = host.split(":")[0].toLowerCase();

  // Dev / localhost / IP
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.")
  ) {
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
  return DEFAULT_TENANT;
}

// ═══════════════════════════════════════════════════════════════════════════
// REDIRECT CACHE (слияние категорий)
// ═══════════════════════════════════════════════════════════════════════════
// Кэш редиректов в памяти Edge Runtime (сбрасывается при деплое)
let redirectCache: Map<string, { toSlug: string | null; permanent: boolean }> | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

async function getRedirects(): Promise<Map<string, { toSlug: string | null; permanent: boolean }>> {
  const now = Date.now();
  if (redirectCache && now - cacheTime < CACHE_TTL_MS) return redirectCache;

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL || "https://pilo-rus.ru"}/api/internal/redirects`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return new Map();
    const data: Array<{ fromSlug: string; toSlug: string | null; permanent: boolean }> = await res.json();
    redirectCache = new Map(data.map((r) => [r.fromSlug, { toSlug: r.toSlug, permanent: r.permanent }]));
    cacheTime = now;
    return redirectCache;
  } catch {
    return new Map();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host") || "";
  const tenantId = detectTenant(host);

  // 1. Redirect для переименованных категорий (существующая логика)
  if (url.pathname === "/catalog") {
    const categorySlug = url.searchParams.get("category");
    if (categorySlug) {
      const redirects = await getRedirects();
      const match = redirects.get(categorySlug);
      if (match) {
        const destination = match.toSlug
          ? `/catalog?category=${match.toSlug}`
          : "/catalog";
        return NextResponse.redirect(new URL(destination, request.url), {
          status: match.permanent ? 301 : 302,
        });
      }
    }
  }

  // 2. Прокидываем tenant в request headers (серверный код может читать)
  //    Пока только информационно — в Этапе 3 будет использоваться для фильтрации данных.
  const response = NextResponse.next({
    request: {
      headers: (() => {
        const h = new Headers(request.headers);
        h.set("x-tenant-id", tenantId);
        return h;
      })(),
    },
  });

  // Response header для дебага и аналитики
  response.headers.set("x-tenant-id", tenantId);

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
