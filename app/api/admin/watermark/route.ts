export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import { createHash } from "crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

const WATERMARK_POSITIONS = new Set(["bottom-right", "bottom-left", "top-right", "top-left", "center"]);
const WATERMARK_TYPES = new Set(["logo", "text"]);
const WATERMARK_LOGO_MIME = new Set(["image/png", "image/webp", "image/svg+xml"]);
const WATERMARK_LOGO_MAX_SIZE = 5 * 1024 * 1024;
const DEFAULT_TEXT_COLOR = `#${"ffffff"}`;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function normalizeWatermarkOptions(body: Record<string, unknown>) {
  const position = typeof body.position === "string" && WATERMARK_POSITIONS.has(body.position)
    ? body.position
    : "bottom-right";
  const type = typeof body.type === "string" && WATERMARK_TYPES.has(body.type) ? body.type : "logo";
  const opacity = clampNumber(body.opacity, 0.05, 1, 0.75);
  const sizePct = Math.round(clampNumber(body.sizePct, 5, 40, 20));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 80) : "";
  const textColor = typeof body.textColor === "string" && /^#[0-9a-f]{6}$/i.test(body.textColor)
    ? body.textColor
    : DEFAULT_TEXT_COLOR;

  return { position, opacity, sizePct, type, text, textColor };
}

function isSafeWatermarkImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  return value.startsWith("/images/") && !value.includes("..") && !value.includes("\\") && !value.includes("//");
}

function saveWatermarkSetting(tenantId: string, key: string, value: string) {
  return prisma.siteSettings.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, value },
    update: { value },
  });
}

// GET: return current watermark settings
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const rows = await prisma.siteSettings.findMany({
    where: { tenantId, key: { in: ["watermark_logo_url", "watermark_position", "watermark_opacity", "watermark_size_pct", "watermark_type", "watermark_text", "watermark_text_color", "watermark_backup_date"] } },
  });
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  return NextResponse.json(result);
}

// POST — multiple actions
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const contentType = req.headers.get("content-type") || "";

  // Upload watermark logo (multipart)
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!WATERMARK_LOGO_MIME.has(file.type) || file.size > WATERMARK_LOGO_MAX_SIZE) {
      return NextResponse.json({ error: "Загрузите PNG, WebP или SVG до 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "images", "watermarks");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const filename = `watermark-logo.png`;
    const png = await sharp(buf, { limitInputPixels: 4096 * 4096 })
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    await writeFile(join(uploadsDir, filename), png);
    const url = `/images/watermarks/${filename}`;

    await saveWatermarkSetting(tenantId, "watermark_logo_url", url);

    return NextResponse.json({ url });
  }

  const body = await req.json();
  const { action } = body;

  // ── Save settings ──
  if (action === "save_settings") {
    const { position, opacity, sizePct, type, text, textColor } = normalizeWatermarkOptions(body);
    const settingsToSave = [
      { key: "watermark_position",   value: position },
      { key: "watermark_opacity",    value: String(opacity) },
      { key: "watermark_size_pct",   value: String(sizePct) },
      { key: "watermark_type",       value: type },
      { key: "watermark_text",       value: text },
      { key: "watermark_text_color", value: textColor },
    ];
    await Promise.all(settingsToSave.map(({ key, value }) =>
      saveWatermarkSetting(tenantId, key, value)
    ));
    return NextResponse.json({ ok: true });
  }

  // ── Apply to single image ──
  if (action === "apply") {
    const { imageUrl } = body;
    const { position, opacity, sizePct, type, text, textColor } = normalizeWatermarkOptions(body);
    if (!isSafeWatermarkImageUrl(imageUrl)) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    const result = await applyWatermark(imageUrl, position, opacity, sizePct, type, text, textColor);
    return NextResponse.json(result);
  }

  // ── Backup all product images ──
  if (action === "backup_images") {
    const products = await prisma.product.findMany({ where: { tenantId }, select: { id: true, images: true } });
    const backup = products.map(p => ({ id: p.id, images: p.images }));
    const backupJson = JSON.stringify(backup);
    // Store in chunks if large — for simplicity store as single SiteSettings entry
    await saveWatermarkSetting(tenantId, "watermark_backup", backupJson);
    await saveWatermarkSetting(tenantId, "watermark_backup_date", new Date().toISOString());
    return NextResponse.json({ ok: true, count: products.length });
  }

  // ── Restore all product images from backup ──
  if (action === "restore_images") {
    const backupRow = await prisma.siteSettings.findFirst({ where: { key: "watermark_backup", tenantId } });
    if (!backupRow) return NextResponse.json({ error: "Нет резервной копии" }, { status: 400 });

    const backup: { id: string; images: string[] }[] = JSON.parse(backupRow.value);
    let restored = 0;
    for (const item of backup) {
      const result = await prisma.product.updateMany({ where: { id: item.id, tenantId }, data: { images: item.images } });
      restored += result.count;
    }
    return NextResponse.json({ ok: true, restored });
  }

  // ── Apply to ALL images ──
  if (action === "apply_all") {
    const { position, opacity, sizePct, type, text, textColor } = normalizeWatermarkOptions(body);
    const products = await prisma.product.findMany({ where: { tenantId }, select: { id: true, images: true } });

    // ✅ АВТО-БЭКАП перед применением — всегда, автоматически
    const backup = products.map((p) => ({ id: p.id, images: p.images }));
    await saveWatermarkSetting(tenantId, "watermark_backup", JSON.stringify(backup));
    await saveWatermarkSetting(tenantId, "watermark_backup_date", new Date().toISOString());

    let count = 0;
    for (const product of products) {
      if (!product.images?.length) continue;
      const newImages: string[] = [];
      for (const imgUrl of product.images) {
        const res = await applyWatermark(imgUrl, position, opacity, sizePct, type, text, textColor);
        newImages.push(res.url ?? imgUrl);
      }
      const result = await prisma.product.updateMany({ where: { id: product.id, tenantId }, data: { images: newImages } });
      count += result.count;
    }
    return NextResponse.json({ ok: true, count });
  }

  // ── Cleanup orphaned wm- files ──
  if (action === "cleanup_orphans") {
    const { readdir } = await import("fs/promises");
    const productsDir = join(process.cwd(), "public", "images", "products");

    // Collect all wm-* filenames on disk
    let diskFiles: string[] = [];
    try {
      const all = await readdir(productsDir);
      diskFiles = all.filter((f) => f.startsWith("wm-"));
    } catch { return NextResponse.json({ ok: true, deleted: 0 }); }

    // Collect all image URLs referenced by products
    const products = await prisma.product.findMany({ where: { tenantId }, select: { images: true } });
    const usedUrls = new Set<string>();
    for (const p of products) for (const img of p.images) usedUrls.add(img);

    // Delete wm- files not referenced by any product
    let deleted = 0;
    for (const file of diskFiles) {
      const url = `/images/products/${file}`;
      if (!usedUrls.has(url)) {
        try { await unlink(join(productsDir, file)); deleted++; } catch { /* skip */ }
      }
    }
    return NextResponse.json({ ok: true, deleted });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function applyWatermark(
  imageUrl: string,
  position: string,
  opacity: number,
  sizePct: number,
  type: string = "logo",
  text: string = "",
  textColor: string = "#ffffff"
): Promise<{ url: string; error?: string }> {
  try {
    const tenantId = getCurrentTenantId();
    // Fetch product image
    const isExternal = imageUrl.startsWith("http");
    let imageBuffer: Buffer;
    if (isExternal) {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      const localPath = join(process.cwd(), "public", imageUrl);
      imageBuffer = await readFile(localPath);
    }

    const mainImage = sharp(imageBuffer);
    const meta = await mainImage.metadata();
    const imgWidth = meta.width || 800;
    const imgHeight = meta.height || 800;

    const gravity = ({
      "bottom-right": "southeast",
      "bottom-left":  "southwest",
      "top-right":    "northeast",
      "top-left":     "northwest",
      "center":       "center",
    } as Record<string, sharp.Gravity>)[position] ?? "southeast";

    let watermarkBuf: Buffer;

    if (type === "text" && text.trim()) {
      // ── Text watermark ──
      const targetW = Math.round(imgWidth * (sizePct / 100) * 3); // wider for text
      const fontSize = Math.max(16, Math.round(Math.min(imgWidth, imgHeight) * (sizePct / 100) * 0.6));
      const padX = Math.round(fontSize * 0.5);
      const padY = Math.round(fontSize * 0.3);
      const svgW = Math.min(imgWidth - 20, text.length * fontSize * 0.6 + padX * 2);
      const svgH = fontSize + padY * 2;

      const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const svgBuf = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
          <text x="${svgW/2}" y="${svgH/2}" text-anchor="middle" dominant-baseline="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold"
            fill="${textColor}" opacity="${opacity}" letter-spacing="1">
            ${safeText}
          </text>
        </svg>`
      );
      watermarkBuf = await sharp(svgBuf).png().toBuffer();
    } else {
      // ── Logo watermark ──
      const logoSetting = await prisma.siteSettings.findFirst({ where: { key: "watermark_logo_url", tenantId } });
      if (!logoSetting) return { url: imageUrl, error: "No watermark logo set" };

      const logoRelative = logoSetting.value.replace(/^\/+/, "");
      const logoPath = join(process.cwd(), "public", logoRelative);
      if (!existsSync(logoPath)) return { url: imageUrl, error: `Watermark file not found: ${logoPath}` };

      const wmarkSize = Math.round(Math.min(imgWidth, imgHeight) * (sizePct / 100));
      const rawLogoBuf = await sharp(logoPath)
        .resize(wmarkSize, wmarkSize, { fit: "inside" })
        .ensureAlpha()
        .toBuffer();

      // ✅ FIX: actually apply opacity to alpha channel
      const { data, info } = await sharp(rawLogoBuf).raw().toBuffer({ resolveWithObject: true });
      for (let i = 3; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * opacity);
      }
      watermarkBuf = await sharp(Buffer.from(data), {
        raw: { width: info.width, height: info.height, channels: 4 as const }
      }).png().toBuffer();
    }

    // Composite + convert to WebP for optimal size
    const resultBuffer = await mainImage
      .composite([{ input: watermarkBuf, gravity, blend: "over" }])
      .webp({ quality: 85 })
      .toBuffer();

    // Save result — deterministic filename prevents duplicates:
    // same source image → same wm-*.webp, re-apply overwrites instead of creating a new file
    const uploadsDir = join(process.cwd(), "public", "images", "products");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const sourceHash = createHash("md5").update(imageUrl).digest("hex").slice(0, 10);
    const sourceBase = basename(imageUrl).replace(/\.[^.]+$/, "").replace(/^wm-[a-f0-9]+-/, "").slice(0, 30);
    const filename = `wm-${sourceBase}-${sourceHash}.webp`;
    const outPath = join(uploadsDir, filename);

    // If source was itself a wm-* file (re-applying), delete the old orphan after writing new
    const isOldWm = imageUrl.startsWith("/images/products/wm-") && !imageUrl.endsWith(filename);

    await writeFile(outPath, resultBuffer);

    if (isOldWm) {
      const oldPath = join(process.cwd(), "public", imageUrl.replace(/^\/+/, ""));
      try { await unlink(oldPath); } catch { /* already gone */ }
    }

    return { url: `/images/products/${filename}` };
  } catch (err: any) {
    console.error("[watermark] apply error:", err);
    return { url: imageUrl, error: err.message };
  }
}
