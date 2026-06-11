export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { canManageGlobalMedia, canViewGlobalMedia } from "@/lib/media-permissions";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function getRole() {
  const session = await auth();
  return session?.user?.role;
}

const MEDIA_DIRS = [
  "products",
  "categories",
  "production",
  "aray",
  "watermarks",
  "banners",
  "posts",
  "services",
  "stories",
  "videos",
  "brand",
  "default",
];
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "svg", "gif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);
const DEFAULT_MEDIA_LIMIT = 500;
type MediaUsage = {
  type: "product" | "category" | "service" | "post" | "story" | "review" | "promotion" | "settings";
  id: string;
  name: string;
  slug: string;
};

function extractLocalImageUrls(value: string): string[] {
  const urls = new Set<string>();
  const collect = (input: unknown) => {
    if (typeof input === "string") {
      if (input.startsWith("/images/")) urls.add(input);
      const matches = input.match(/\/images\/[A-Za-z0-9/_.,~%+-]+/g) ?? [];
      for (const match of matches) {
        urls.add(match.replace(/[),.;\]}]+$/g, ""));
      }
      return;
    }
    if (Array.isArray(input)) {
      for (const item of input) collect(item);
      return;
    }
    if (input && typeof input === "object") {
      for (const item of Object.values(input as Record<string, unknown>)) collect(item);
    }
  };

  try {
    collect(JSON.parse(value));
  } catch {
    collect(value);
  }
  return Array.from(urls);
}

function parseAltMap(value?: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function revalidateMediaPublicPaths() {
  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/sitemap.xml");
}

function getMediaKind(filename: string): "image" | "video" | "document" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return "document";
}

// ── GET: list all media files ─────────────────────────────────────────────────
export async function GET(req: Request) {
  const role = await getRole();
  if (!canViewGlobalMedia(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? DEFAULT_MEDIA_LIMIT) || DEFAULT_MEDIA_LIMIT, 1), 1000);

  // Load ALT map from SiteSettings
  const altRow = await prisma.siteSettings.findFirst({ where: { key: "media_alt_map", tenantId } });
  const altMap = parseAltMap(altRow?.value);

  // Load all products to know which images are used where
  const [products, categories, services, posts, stories, reviews, promotions, settings] = await Promise.all([
    prisma.product.findMany({ where: { tenantId }, select: { id: true, name: true, slug: true, images: true } }),
    prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true, slug: true, image: true } }),
    prisma.service.findMany({ where: { tenantId }, select: { id: true, title: true, slug: true, image: true } }),
    prisma.post.findMany({ where: { tenantId }, select: { id: true, title: true, slug: true, coverImage: true } }),
    prisma.storeStory.findMany({ where: { tenantId }, select: { id: true, title: true, mediaUrl: true, posterUrl: true, relations: true } }),
    prisma.review.findMany({ where: { tenantId }, select: { id: true, name: true, images: true } }),
    prisma.promotion.findMany({ where: { tenantId }, select: { id: true, title: true, imageUrl: true } }),
    prisma.siteSettings.findMany({
      where: { tenantId, key: { notIn: ["media_alt_map", "watermark_backup"] } },
      select: { key: true, value: true },
    }),
  ]);

  // Build usage map: url → [{type, id, name, slug}]
  const usageMap: Record<string, MediaUsage[]> = {};
  const pushUsage = (url: string | null | undefined, usage: MediaUsage) => {
    const cleanUrl = url?.trim();
    if (!cleanUrl) return;
    if (!usageMap[cleanUrl]) usageMap[cleanUrl] = [];
    usageMap[cleanUrl].push(usage);
  };
  for (const p of products) {
    for (const img of p.images) {
      pushUsage(img, { type: "product", id: p.id, name: p.name, slug: p.slug });
    }
  }
  for (const c of categories) {
    pushUsage(c.image, { type: "category", id: c.id, name: c.name, slug: c.slug });
  }
  for (const service of services) {
    for (const url of (service.image ?? "").split(/\r?\n/)) {
      pushUsage(url, { type: "service", id: service.id, name: service.title, slug: service.slug });
    }
  }
  for (const post of posts) {
    pushUsage(post.coverImage, { type: "post", id: post.id, name: post.title, slug: post.slug });
  }
  for (const story of stories) {
    pushUsage(story.mediaUrl, { type: "story", id: story.id, name: story.title, slug: story.id });
    pushUsage(story.posterUrl, { type: "story", id: story.id, name: story.title, slug: story.id });
    for (const relation of story.relations || []) {
      const relationRecord = relation as { image?: unknown } | null;
      const image = relationRecord && typeof relationRecord === "object" ? String(relationRecord.image || "") : "";
      pushUsage(image, { type: "story", id: story.id, name: story.title, slug: story.id });
    }
  }
  for (const review of reviews) {
    for (const img of review.images) {
      pushUsage(img, { type: "review", id: review.id, name: `Отзыв: ${review.name}`, slug: review.id });
    }
  }
  for (const promotion of promotions) {
    pushUsage(promotion.imageUrl, { type: "promotion", id: promotion.id, name: `Акция: ${promotion.title}`, slug: promotion.id });
  }
  for (const setting of settings) {
    for (const imageUrl of extractLocalImageUrls(setting.value)) {
      pushUsage(imageUrl, { type: "settings", id: setting.key, name: `Настройки: ${setting.key}`, slug: setting.key });
    }
  }

  // Scan directories
  const files: {
    url: string; folder: string; filename: string; kind: "image" | "video" | "document";
    size: number; mtime: number; alt: string;
    usedIn: MediaUsage[];
  }[] = [];

  for (const folder of MEDIA_DIRS) {
    const dir = join(process.cwd(), "public", "images", folder);
    if (!existsSync(dir)) continue;
    const entries = await readdir(dir);
    for (const filename of entries) {
      try {
        const s = await stat(join(dir, filename));
        if (!s.isFile()) continue;
        const url = `/images/${folder}/${filename}`;
        files.push({
          url, folder, filename,
          kind: getMediaKind(filename),
          size: s.size,
          mtime: s.mtimeMs,
          alt: altMap[url] ?? "",
          usedIn: usageMap[url] ?? [],
        });
      } catch { /* skip */ }
    }
  }

  // Sort: newest first
  files.sort((a, b) => b.mtime - a.mtime);

  return NextResponse.json({ files: files.slice(0, limit), total: files.length, hasMore: files.length > limit });
}

// ── POST: save ALT or delete file ─────────────────────────────────────────────
export async function POST(req: Request) {
  const role = await getRole();
  if (!canViewGlobalMedia(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const body = await req.json();
  const { action } = body;

  // ── Save ALT text for one or many images ──
  if (action === "save_alt") {
    if (!canManageGlobalMedia(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { url, alt } = body as { url: string; alt: string };
    if (!url || !url.startsWith("/images/") || url.includes("..")) return NextResponse.json({ error: "Invalid url" }, { status: 400 });

    const altRow = await prisma.siteSettings.findFirst({ where: { key: "media_alt_map", tenantId } });
    const altMap = parseAltMap(altRow?.value);
    if (alt) altMap[url] = alt;
    else delete altMap[url];

    await prisma.siteSettings.upsert({
      where: { tenantId_key: { tenantId, key: "media_alt_map" } },
      create: { tenantId, key: "media_alt_map", value: JSON.stringify(altMap) },
      update: { value: JSON.stringify(altMap) },
    });
    revalidateMediaPublicPaths();
    return NextResponse.json({ ok: true });
  }

  // ── Auto-generate ALT from product names ──
  if (action === "auto_generate_alt") {
    if (!canManageGlobalMedia(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const products = await prisma.product.findMany({ where: { tenantId }, select: { name: true, images: true } });
    const categories = await prisma.category.findMany({ where: { tenantId }, select: { name: true, image: true } });

    const altRow = await prisma.siteSettings.findFirst({ where: { key: "media_alt_map", tenantId } });
    const altMap = parseAltMap(altRow?.value);

    let count = 0;
    for (const p of products) {
      for (const img of p.images) {
        if (!altMap[img]) { // Don't overwrite manually set ALTs
          altMap[img] = p.name;
          count++;
        }
      }
    }
    for (const c of categories) {
      if (c.image && !altMap[c.image]) {
        altMap[c.image] = c.name;
        count++;
      }
    }

    await prisma.siteSettings.upsert({
      where: { tenantId_key: { tenantId, key: "media_alt_map" } },
      create: { tenantId, key: "media_alt_map", value: JSON.stringify(altMap) },
      update: { value: JSON.stringify(altMap) },
    });
    revalidateMediaPublicPaths();
    return NextResponse.json({ ok: true, count });
  }

  // ── Delete file ──
  if (action === "delete") {
    if (!canManageGlobalMedia(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { url } = body as { url: string };
    if (!url || !url.startsWith("/images/")) return NextResponse.json({ error: "Invalid url" }, { status: 400 });

    // Prevent path traversal: reject urls with ".." or that escape /images/
    if (url.includes("..") || url.includes("\\") || url.includes("//")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const resolvedPath = join(process.cwd(), "public", url);
    const allowedBase = join(process.cwd(), "public", "images");
    if (!resolvedPath.startsWith(allowedBase)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Check if used
    const [products, categories, services, posts, stories, reviews, promotions, settings] = await Promise.all([
      prisma.product.findMany({ where: { tenantId }, select: { id: true, images: true } }),
      prisma.category.findMany({ where: { tenantId }, select: { id: true, image: true } }),
      prisma.service.findMany({ where: { tenantId }, select: { id: true, image: true } }),
      prisma.post.findMany({ where: { tenantId }, select: { id: true, coverImage: true } }),
      prisma.storeStory.findMany({ where: { tenantId }, select: { id: true, mediaUrl: true, posterUrl: true, relations: true } }),
      prisma.review.findMany({ where: { tenantId }, select: { id: true, images: true } }),
      prisma.promotion.findMany({ where: { tenantId }, select: { id: true, imageUrl: true } }),
      prisma.siteSettings.findMany({
        where: { tenantId, key: { notIn: ["media_alt_map", "watermark_backup"] } },
        select: { key: true, value: true },
      }),
    ]);
    const isUsedByProduct = products.some((p) => p.images.includes(url));
    const isUsedByCategory = categories.some((c) => c.image === url);
    const isUsedByService = services.some((service) => (service.image ?? "").split(/\r?\n/).map((item) => item.trim()).includes(url));
    const isUsedByPost = posts.some((post) => post.coverImage === url);
    const isUsedByReview = reviews.some((review) => review.images.includes(url));
    const isUsedByPromotion = promotions.some((promotion) => promotion.imageUrl === url);
    const isUsedBySettings = settings.some((setting) => extractLocalImageUrls(setting.value).includes(url));
    const isUsedByStory = stories.some((story) => {
      if (story.mediaUrl === url || story.posterUrl === url) return true;
      return (story.relations || []).some((relation) => {
        const relationRecord = relation as { image?: unknown } | null;
        return Boolean(relationRecord && typeof relationRecord === "object" && relationRecord.image === url);
      });
    });
    if (isUsedByProduct || isUsedByCategory || isUsedByService || isUsedByPost || isUsedByStory || isUsedByReview || isUsedByPromotion || isUsedBySettings) {
      return NextResponse.json(
        { error: "Файл используется на сайте. Сначала уберите его из товара, услуги, статьи, акции, отзыва, настроек или сторис." },
        { status: 400 }
      );
    }

    const filePath = resolvedPath;
    if (existsSync(filePath)) await unlink(filePath);

    // Remove from ALT map
    const altRow = await prisma.siteSettings.findFirst({ where: { key: "media_alt_map", tenantId } });
    if (altRow) {
      const altMap = parseAltMap(altRow.value);
      delete altMap[url];
      await prisma.siteSettings.update({
        where: { tenantId_key: { tenantId, key: "media_alt_map" } },
        data: { value: JSON.stringify(altMap) },
      });
    }

    revalidateMediaPublicPaths();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
