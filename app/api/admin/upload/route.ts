export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Максимальные размеры и качество для разных папок
const RESIZE_CONFIG: Record<string, { width: number; height: number; quality: number }> = {
  categories: { width: 900, height: 600, quality: 85 },
  products: { width: 1200, height: 900, quality: 85 },
  default: { width: 1200, height: 900, quality: 85 },
};

// Whitelists
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const ALLOWED_FOLDERS = ["categories", "products", "production", "brand", "default"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB for admin

// Magic number validation
function validateImageMagic(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png")
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  if (mime === "image/gif")
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  if (mime === "image/webp")
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    );
  return false;
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !["SUPER_ADMIN", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const rawFolder = (formData.get("folder") as string) || "products";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Whitelist folder (prevents path traversal like "../../secrets")
  const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "default";

  // MIME whitelist
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Допустимы только JPG/PNG/WebP/GIF" },
      { status: 400 }
    );
  }

  // Size limit
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Максимальный размер 10MB" },
      { status: 400 }
    );
  }

  // Extension whitelist
  const extRaw = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!ALLOWED_EXT.includes(extRaw)) {
    return NextResponse.json(
      { error: "Недопустимое расширение файла" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);

  // Magic number validation (anti-spoof)
  if (!validateImageMagic(inputBuffer, file.type)) {
    return NextResponse.json(
      { error: "Файл не является валидным изображением" },
      { status: 400 }
    );
  }

  const cfg = RESIZE_CONFIG[folder] ?? RESIZE_CONFIG.default;
  const timestamp = Date.now();
  const dir = join(process.cwd(), "public", "images", folder);

  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  // Sharp → WebP
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
    // Sharp fallback — save original with VALIDATED extension only
    const filename = `upload-${timestamp}.${extRaw}`;
    await writeFile(join(dir, filename), inputBuffer);
    return NextResponse.json({ url: `/images/${folder}/${filename}` });
  }
}
