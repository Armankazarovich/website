export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { canUploadGlobalMedia } from "@/lib/media-permissions";

// Максимальные размеры и качество для разных папок
const RESIZE_CONFIG: Record<string, { width: number; height: number; quality: number }> = {
  categories: { width: 900, height: 600, quality: 85 },
  products: { width: 1200, height: 900, quality: 85 },
  stories: { width: 1080, height: 1920, quality: 86 },
  services: { width: 1200, height: 900, quality: 85 },
  default: { width: 1200, height: 900, quality: 85 },
};

// Whitelists
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const VIDEO_EXT = ["mp4", "webm", "mov"];
const ALLOWED_MIME = [...IMAGE_MIME, ...VIDEO_MIME];
const ALLOWED_EXT = [...IMAGE_EXT, ...VIDEO_EXT];
const ALLOWED_FOLDERS = [
  "categories",
  "products",
  "production",
  "aray",
  "brand",
  "watermarks",
  "banners",
  "posts",
  "services",
  "stories",
  "videos",
  "default",
];
const IMAGE_MAX_SIZE = 25 * 1024 * 1024; // 25MB for phone/admin images
const VIDEO_MAX_SIZE = 80 * 1024 * 1024; // 80MB for admin videos

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
      buffer[3] === 0x46 &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  return false;
}

function validateVideoMagic(buffer: Buffer, mime: string, ext: string): boolean {
  if (buffer.length < 12) return false;
  if (mime === "video/webm" || ext === "webm") {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }
  if (mime === "video/mp4" || mime === "video/quicktime" || ext === "mp4" || ext === "mov") {
    return buffer.toString("ascii", 4, 8) === "ftyp";
  }
  return false;
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !canUploadGlobalMedia(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const rawFolder = (formData.get("folder") as string) || "products";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Whitelist folder (prevents path traversal like "../../secrets")
  const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "default";
  const isImage = IMAGE_MIME.includes(file.type);
  const isVideo = VIDEO_MIME.includes(file.type);

  // MIME whitelist
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Допустимы JPG/PNG/WebP/GIF и MP4/WebM/MOV" },
      { status: 400 }
    );
  }

  // Size limit
  const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `Максимальный размер ${isVideo ? "80MB" : "25MB"}` },
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
  if (isImage && !validateImageMagic(inputBuffer, file.type)) {
    return NextResponse.json(
      { error: "Файл не является валидным изображением" },
      { status: 400 }
    );
  }
  if (isVideo && !validateVideoMagic(inputBuffer, file.type, extRaw)) {
    return NextResponse.json(
      { error: "Файл не является валидным видео" },
      { status: 400 }
    );
  }

  const cfg = RESIZE_CONFIG[folder] ?? RESIZE_CONFIG.default;
  const uploadId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const dir = join(process.cwd(), "public", "images", folder);

  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  if (isVideo) {
    const filename = `upload-${uploadId}.${extRaw}`;
    await writeFile(join(dir, filename), inputBuffer);
    return NextResponse.json({ url: `/images/${folder}/${filename}` });
  }

  // Sharp → WebP
  try {
    const sharp = (await import("sharp")).default;
    const optimized = await sharp(inputBuffer)
      .resize(cfg.width, cfg.height, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: cfg.quality })
      .toBuffer();

    const filename = `upload-${uploadId}.webp`;
    await writeFile(join(dir, filename), optimized);
    return NextResponse.json({ url: `/images/${folder}/${filename}` });
  } catch {
    // Sharp fallback — save original with VALIDATED extension only
    const filename = `upload-${uploadId}.${extRaw}`;
    await writeFile(join(dir, filename), inputBuffer);
    return NextResponse.json({ url: `/images/${folder}/${filename}` });
  }
}
