import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { clampArayPwaIconSize } from "@/lib/aray-pwa-icon";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

const DEFAULT_SITE_LOGO = "/icons/icon-512x512.png";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PILORUS_PWA_APPS = new Set(["", "pilorus-site", "pilorus-catalog"]);
const PILORUS_HOST_PARTS = ["pilo-rus", "pilorus"];

function cleanLogoUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return "";
}

function getRequestHost(req: NextRequest) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "";
  return host.split(",")[0]?.trim().replace(/:\d+$/, "") || "";
}

async function resolveTenantLogoUrl(req: NextRequest) {
  const host = getRequestHost(req);
  const tenantParam = req.nextUrl.searchParams.get("tenant")?.trim();

  try {
    const tenant = await prisma.tenant.findFirst({
      where: {
        active: true,
        OR: [
          tenantParam ? { slug: tenantParam } : undefined,
          host && !LOCAL_HOSTS.has(host) ? { domain: host } : undefined,
          host && !LOCAL_HOSTS.has(host) ? { slug: host.split(".")[0] } : undefined,
          LOCAL_HOSTS.has(host) ? { slug: "pilorus" } : undefined,
        ].filter(Boolean) as any,
      },
      select: { logoUrl: true },
    });
    return cleanLogoUrl(tenant?.logoUrl);
  } catch {
    return "";
  }
}

async function resolveSiteLogoUrl(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get("app")?.trim() || "";
  const explicitTenant = req.nextUrl.searchParams.get("tenant")?.trim();
  const host = getRequestHost(req);
  const isPilorusHost = !host || LOCAL_HOSTS.has(host) || PILORUS_HOST_PARTS.some((part) => host.includes(part));

  if (!explicitTenant && PILORUS_PWA_APPS.has(appId) && isPilorusHost) {
    return DEFAULT_SITE_LOGO;
  }

  const settings = await getSiteSettings();
  return (
    normalizePwaLogoUrl(settings.pwa_logo_url) ||
    normalizePwaLogoUrl(settings.site_logo_url) ||
    normalizePwaLogoUrl(settings.logo_url) ||
    (await resolveTenantLogoUrl(req)) ||
    DEFAULT_SITE_LOGO
  );
}

function normalizePwaLogoUrl(value: unknown) {
  const logoUrl = cleanLogoUrl(value);
  if (!logoUrl) return "";
  if (logoUrl === "/logo.png") return DEFAULT_SITE_LOGO;
  return logoUrl;
}

function resolvePublicFilePath(src: string) {
  const publicRoot = path.resolve(process.cwd(), "public");
  const cleanPath = src.split(/[?#]/)[0]?.replace(/^\/+/, "") || "";
  const resolved = path.resolve(publicRoot, cleanPath);
  if (resolved === publicRoot || !resolved.startsWith(`${publicRoot}${path.sep}`)) return null;
  return resolved;
}

async function readLocalLogo(src: string) {
  const resolved = resolvePublicFilePath(src);
  if (!resolved) throw new Error("Invalid local logo path");
  return readFile(resolved);
}

async function fetchRemoteLogo(src: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(src, { signal: controller.signal });
    if (!response.ok) throw new Error(`Logo fetch failed: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

async function readLogoSource(src: string) {
  if (src.startsWith("/")) return readLocalLogo(src);
  if (src.startsWith("https://") || src.startsWith("http://")) return fetchRemoteLogo(src);
  return readLocalLogo(DEFAULT_SITE_LOGO);
}

export async function createSitePwaIconResponse(rawSize: string | null | undefined, req: NextRequest) {
  const size = clampArayPwaIconSize(Number(rawSize ?? 512));
  const logoUrl = await resolveSiteLogoUrl(req);

  let source: Buffer;
  try {
    source = await readLogoSource(logoUrl);
  } catch {
    source = await readLocalLogo(DEFAULT_SITE_LOGO);
  }

  const png = await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const body = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
