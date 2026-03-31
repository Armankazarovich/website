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
    where: { key: { in: ["watermark_logo_url", "watermark_position", "watermark_opacity", "watermark_size_pct"] } },
  });
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  return NextResponse.json(result);
}

// POST with action=upload_logo — saves watermark logo, returns URL
// POST with action=apply — applies watermark to a single image URL, returns new URL
// POST with action=apply_all — applies watermark to ALL product images in DB
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Upload watermark logo
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
      create: { key: "watermark_logo_url", value: url },
      update: { value: url },
    });

    return NextResponse.json({ url });
  }

  const body = await req.json();
  const { action, imageUrl, position = "bottom-right", opacity = 0.75, sizePct = 20 } = body;

  if (action === "save_settings") {
    await Promise.all([
      prisma.siteSettings.upsert({ where: { key: "watermark_position" }, create: { key: "watermark_position", value: position }, update: { value: position } }),
      prisma.siteSettings.upsert({ where: { key: "watermark_opacity" }, create: { key: "watermark_opacity", value: String(opacity) }, update: { value: String(opacity) } }),
      prisma.siteSettings.upsert({ where: { key: "watermark_size_pct" }, create: { key: "watermark_size_pct", value: String(sizePct) }, update: { value: String(sizePct) } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "apply" && imageUrl) {
    const result = await applyWatermark(imageUrl, position, opacity, sizePct);
    return NextResponse.json(result);
  }

  if (action === "apply_all") {
    // Apply watermark to ALL product images
    const products = await prisma.product.findMany({ select: { id: true, images: true } });
    let count = 0;
    for (const product of products) {
      if (!product.images?.length) continue;
      const newImages: string[] = [];
      for (const imgUrl of product.images) {
        const res = await applyWatermark(imgUrl, position, opacity, sizePct);
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
  sizePct: number
): Promise<{ url: string; error?: string }> {
  try {
    // Get watermark logo URL from settings
    const logoSetting = await prisma.siteSettings.findUnique({ where: { key: "watermark_logo_url" } });
    if (!logoSetting) return { url: imageUrl, error: "No watermark logo set" };

    const logoUrl = logoSetting.value;
    // Strip leading slash so path.join doesn't treat it as absolute root
    const logoRelative = logoUrl.replace(/^\/+/, "");
    const logoPath = join(process.cwd(), "public", logoRelative);
    if (!existsSync(logoPath)) return { url: imageUrl, error: `Watermark file not found: ${logoPath}` };

    // Fetch or read the product image
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

    // Scale watermark to sizePct% of the shorter dimension
    const wmarkSize = Math.round(Math.min(imgWidth, imgHeight) * (sizePct / 100));

    const watermarkBuf = await sharp(logoPath)
      .resize(wmarkSize, wmarkSize, { fit: "inside" })
      .toBuffer();

    // Composite with opacity (Sharp uses composite with blend mode)
    const wmarkMeta = await sharp(watermarkBuf).metadata();
    const wmarkW = wmarkMeta.width || wmarkSize;
    const wmarkH = wmarkMeta.height || wmarkSize;

    const margin = Math.round(Math.min(imgWidth, imgHeight) * 0.03);

    const gravity = ({
      "bottom-right": "southeast",
      "bottom-left": "southwest",
      "top-right": "northeast",
      "top-left": "northwest",
      center: "center",
    } as Record<string, sharp.Gravity>)[position] ?? "southeast";

    // Create watermark with opacity applied
    const watermarkWithOpacity = await sharp(watermarkBuf)
      .composite([{
        input: Buffer.from(
          `<svg width="${wmarkW}" height="${wmarkH}"><rect width="${wmarkW}" height="${wmarkH}" fill="white" opacity="${1 - opacity}"/></svg>`
        ),
        blend: "dest-in",
      }])
      .png()
      .toBuffer();

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
