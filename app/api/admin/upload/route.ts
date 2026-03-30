export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Максимальные размеры и качество для разных папок
const RESIZE_CONFIG: Record<string, { width: number; height: number; quality: number }> = {
  categories: { width: 900,  height: 600,  quality: 85 },
  products:   { width: 1200, height: 900,  quality: 85 },
  default:    { width: 1200, height: 900,  quality: 85 },
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "products";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);

  const cfg = RESIZE_CONFIG[folder] ?? RESIZE_CONFIG.default;
  const timestamp = Date.now();
  const dir = join(process.cwd(), "public", "images", folder);

  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  // Пробуем сжать через sharp → WebP
  try {
    const sharp = (await import("sharp")).default;
    const optimized = await sharp(inputBuffer)
      .resize(cfg.width, cfg.height, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: cfg.quality })
      .toBuffer();

    const filename = `upload-${timestamp}.webp`;
    await writeFile(join(dir, filename), optimized);
    return NextResponse.json({ url: `/images/${folder}/${filename}` });
  } catch {
    // Sharp недоступен или не смог обработать — сохраняем оригинал
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `upload-${timestamp}.${ext}`;
    await writeFile(join(dir, filename), inputBuffer);
    return NextResponse.json({ url: `/images/${folder}/${filename}` });
  }
}
