import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const categorySlug = url.searchParams.get("category");

  if (url.pathname === "/catalog" && categorySlug) {
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

  return NextResponse.next();
}

export const config = {
  matcher: "/catalog",
};
