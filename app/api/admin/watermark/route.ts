export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

// GET: return current watermark settings
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ["watermark_logo_url", "watermark_position", "watermark_opacity", "watermark_size_pct", "watermark_type", "watermark_text", "watermark_text_color", "watermark_backup_date"] } },
  });
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  return NextResponse.json(result);
}

// POST — multiple actions
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  // Upload watermark logo (multipart)
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "images", "watermarks");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const filename = `watermark-logo.png`;
    await writeFile(join(uploadsDir, filename), buf);
    const url = `/images/watermarks/${filename}`;

    await prisma.siteSettings.upsert({
      where: { key: "watermark_logo_url" },
      create: { id: "watermark_logo_url", key: "watermark_logo_url", value: url },
      update: { value: url },
    });

    return NextResponse.json({ url });
  }

  const body = await req.json();
  const { action } = body;

  // ── Save settings ──
  if (action === "save_settings") {
    const { position = "bottom-right", opacity = 0.75, sizePct = 20, type = "logo", text = "", textColor = "#ffffff" } = body;
    const settingsToSave = [
      { key: "watermark_position",   value: position },
      { key: "watermark_opacity",    value: String(opacity) },
      { key: "watermark_size_pct",   value: String(sizePct) },
      { key: "watermark_type",       value: type },
      { key: "watermark_text",       value: text },
      { key: "watermark_text_color", value: textColor },
    ];
    await Promise.all(settingsToSave.map(({ key, value }) =>
      prisma.siteSettings.upsert({ where: { key }, create: { id: key, key, value }, update: { value } })
    ));
    return NextResponse.json({ ok: true });
  }

  // ── Apply to single image ──
  if (action === "apply") {
    const { imageUrl, position = "bottom-right", opacity = 0.75, sizePct = 20, type = "logo", text = "", textColor = "#ffffff" } = body;
    if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    const result = await applyWatermark(imageUrl, position, opacity, sizePct, type, text, textColor);
    return NextResponse.json(result);
  }

  // ── Backup all product images ──
  if (action === "backup_images") {
    const products = await prisma.product.findMany({ select: { id: true, images: true } });
    const backup = products.map(p => ({ id: p.id, images: p.images }));
    const backupJson = JSON.stringify(backup);
    // Store in chunks if large — for simplicity store as single SiteSettings entry
    await prisma.siteSettings.upsert({
      where: { key: "watermark_backup" },
      create: { id: "watermark_backup", key: "watermark_backup", value: backupJson },
      update: { value: backupJson },
    });
    await prisma.siteSettings.upsert({
      where: { key: "watermark_backup_date" },
      create: { id: "watermark_backup_date", key: "watermark_backup_date", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });
    return NextResponse.json({ ok: true, count: products.length });
  }

  // ── Restore all product images from backup ──
  if (action === "restore_images") {
    const backupRow = await prisma.siteSettings.findUnique({ where: { key: "watermark_backup" } });
    if (!backupRow) return NextResponse.json({ error: "Нет резервной копии" }, { status: 400 });

    const backup: { id: string; images: string[] }[] = JSON.parse(backupRow.value);
    let restored = 0;
    for (const item of backup) {
      await prisma.product.update({ where: { id: item.id }, data: { images: item.images } });
      restored++;
    }
    return NextResponse.json({ ok: true, restored });
  }

  // ── Apply to ALL images ──
  if (action === "apply_all") {
    const { position = "bottom-right", opacity = 0.75, sizePct = 20, type = "logo", text = "", textColor = "#ffffff" } = body;
    const products = await prisma.product.findMany({ select: { id: true, images: true } });
    let count = 0;
    for (const product of products) {
      if (!product.images?.length) continue;
      const newImages: string[] = [];
      for (const imgUrl of product.images) {
        const res = await applyWatermark(imgUrl, position, opacity, sizePct, type, text, textColor);
        newImages.push(res.url ?? imgUrl);
      }
      await prisma.product.update({ where: { id: product.id }, data: { images: newImages } });
      count++;
    }
    return NextResponse.json({ ok: true, count });
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
    // Fetch product image
    const isExternal = imageUrl.startsWith("http");
    let imageBuffer: Buffer;
    if (isExternal) {
      const res = await fetch(imageUrl);
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
      const logoSetting = await prisma.siteSettings.findUnique({ where: { key: "watermark_logo_url" } });
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

    const resultBuffer = await mainImage
      .composite([{ input: watermarkBuf, gravity, blend: "over" }])
      .png()
      .toBuffer();

    // Save result
    const uploadsDir = join(process.cwd(), "public", "images", "products");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const filename = `wm-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    await writeFile(join(uploadsDir, filename), resultBuffer);

    return { url: `/images/products/${filename}` };
  } catch (err: any) {
    console.error("[watermark] apply error:", err);
    return { url: imageUrl, error: err.message };
  }
}
