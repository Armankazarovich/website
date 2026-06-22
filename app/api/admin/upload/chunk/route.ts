export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canUploadGlobalMedia } from "@/lib/media-permissions";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, open, readFile, rm, stat, writeFile } from "fs/promises";
import { join } from "path";

const RESIZE_CONFIG: Record<string, { width: number; height: number; quality: number }> = {
  categories: { width: 900, height: 600, quality: 85 },
  products: { width: 1200, height: 900, quality: 85 },
  stories: { width: 1080, height: 1920, quality: 86 },
  services: { width: 1200, height: 900, quality: 85 },
  default: { width: 1200, height: 900, quality: 85 },
};

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime", "video/x-quicktime", "video/mov", "video/x-m4v"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];
const ALLOWED_EXT = [...IMAGE_EXT, ...VIDEO_EXT];
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
};
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-quicktime": "mov",
  "video/mov": "mov",
  "video/x-m4v": "m4v",
};
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
const IMAGE_MAX_SIZE = 25 * 1024 * 1024;
const VIDEO_MAX_SIZE = 200 * 1024 * 1024;
const STORY_VIDEO_MAX_SIZE = 500 * 1024 * 1024;
const CHUNK_MAX_SIZE = 12 * 1024 * 1024;
const MAX_CHUNKS = 80;

function normalizeMime(mime: string, ext: string): string {
  const cleanMime = mime.toLowerCase();
  if (cleanMime === "video/x-quicktime" || cleanMime === "video/mov") return "video/quicktime";
  if (cleanMime === "video/x-m4v") return "video/mp4";
  if (IMAGE_MIME.includes(cleanMime) || VIDEO_MIME.includes(cleanMime)) return cleanMime;
  return MIME_BY_EXT[ext] ?? cleanMime;
}

function validateImageMagic(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (mime === "image/gif") return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  if (mime === "image/webp") return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

function validateVideoMagic(buffer: Buffer, mime: string, ext: string): boolean {
  if (buffer.length < 12) return false;
  if (mime === "video/webm" || ext === "webm") return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  if (mime === "video/mp4" || mime === "video/quicktime" || ext === "mp4" || ext === "mov" || ext === "m4v") {
    return buffer.toString("ascii", 4, 8) === "ftyp";
  }
  return false;
}

function safeUploadId(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "");
  return /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : "";
}

function numericField(raw: FormDataEntryValue | null) {
  const n = Number(String(raw ?? ""));
  return Number.isFinite(n) ? n : -1;
}

async function cleanup(dir: string) {
  await rm(dir, { recursive: true, force: true }).catch(() => null);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !canUploadGlobalMedia(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const uploadId = safeUploadId(formData.get("uploadId"));
  const index = numericField(formData.get("index"));
  const total = numericField(formData.get("total"));
  const fileSize = numericField(formData.get("fileSize"));
  const originalName = String(formData.get("fileName") || file?.name || "");
  const originalType = String(formData.get("fileType") || file?.type || "");
  const rawFolder = String(formData.get("folder") || "products");

  if (!file || !uploadId || index < 0 || total < 1 || total > MAX_CHUNKS || index >= total || fileSize < 1) {
    return NextResponse.json({ error: "Некорректная загрузка файла" }, { status: 400 });
  }
  if (file.size > CHUNK_MAX_SIZE) {
    return NextResponse.json({ error: "Часть файла слишком большая" }, { status: 400 });
  }

  const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "default";
  const extFromName = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() || "" : "";
  const normalizedMime = normalizeMime(originalType, extFromName);
  const mimeLooksImage = IMAGE_MIME.includes(normalizedMime);
  const mimeLooksVideo = VIDEO_MIME.includes(normalizedMime);
  const extLooksImage = IMAGE_EXT.includes(extFromName);
  const extLooksVideo = VIDEO_EXT.includes(extFromName);
  if ((mimeLooksImage && extLooksVideo) || (mimeLooksVideo && extLooksImage)) {
    return NextResponse.json({ error: "Расширение файла не соответствует типу файла" }, { status: 400 });
  }

  const isImage = mimeLooksImage || extLooksImage;
  const isVideo = mimeLooksVideo || extLooksVideo;
  const extRaw = extLooksImage || extLooksVideo ? extFromName : EXT_BY_MIME[normalizedMime] || "";
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Допустимы JPG/PNG/WebP/GIF и MP4/WebM/MOV/M4V" }, { status: 400 });
  }
  if (!ALLOWED_EXT.includes(extRaw)) {
    return NextResponse.json({ error: "Недопустимое расширение файла" }, { status: 400 });
  }

  const maxSize = isVideo ? (folder === "stories" ? STORY_VIDEO_MAX_SIZE : VIDEO_MAX_SIZE) : IMAGE_MAX_SIZE;
  if (fileSize > maxSize) {
    return NextResponse.json(
      { error: `Максимальный размер ${isVideo ? (folder === "stories" ? "500MB" : "200MB") : "25MB"}` },
      { status: 400 },
    );
  }

  const chunkRoot = join(process.cwd(), ".upload-chunks", uploadId);
  await mkdir(chunkRoot, { recursive: true });
  const chunkPath = join(chunkRoot, `${index}.part`);
  const bytes = await file.arrayBuffer();
  await writeFile(chunkPath, Buffer.from(bytes));

  if (index < total - 1) {
    return NextResponse.json({ ok: true, done: false });
  }

  for (let i = 0; i < total; i += 1) {
    if (!existsSync(join(chunkRoot, `${i}.part`))) {
      return NextResponse.json({ ok: true, done: false });
    }
  }

  let actualSize = 0;
  for (let i = 0; i < total; i += 1) {
    actualSize += (await stat(join(chunkRoot, `${i}.part`))).size;
  }
  if (actualSize !== fileSize) {
    await cleanup(chunkRoot);
    return NextResponse.json({ error: "Файл собран не полностью" }, { status: 400 });
  }

  const firstChunk = await readFile(join(chunkRoot, "0.part"));
  if (isImage && !validateImageMagic(firstChunk, normalizedMime)) {
    await cleanup(chunkRoot);
    return NextResponse.json({ error: "Файл не является валидным изображением" }, { status: 400 });
  }
  if (isVideo && !validateVideoMagic(firstChunk, normalizedMime, extRaw)) {
    await cleanup(chunkRoot);
    return NextResponse.json({ error: "Файл не является валидным видео" }, { status: 400 });
  }

  const cfg = RESIZE_CONFIG[folder] ?? RESIZE_CONFIG.default;
  const uploadName = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const targetDir = join(process.cwd(), "public", "images", folder);
  await mkdir(targetDir, { recursive: true });

  if (isVideo) {
    const filename = `upload-${uploadName}.${extRaw}`;
    const output = await open(join(targetDir, filename), "w");
    try {
      for (let i = 0; i < total; i += 1) {
        await output.write(await readFile(join(chunkRoot, `${i}.part`)));
      }
    } finally {
      await output.close();
    }
    await cleanup(chunkRoot);
    return NextResponse.json({ ok: true, done: true, url: `/images/${folder}/${filename}` });
  }

  const assembled = Buffer.concat(await Promise.all(Array.from({ length: total }, (_, i) => readFile(join(chunkRoot, `${i}.part`)))));
  try {
    const sharp = (await import("sharp")).default;
    const optimized = await sharp(assembled)
      .resize(cfg.width, cfg.height, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: cfg.quality })
      .toBuffer();
    const filename = `upload-${uploadName}.webp`;
    await writeFile(join(targetDir, filename), optimized);
    await cleanup(chunkRoot);
    return NextResponse.json({ ok: true, done: true, url: `/images/${folder}/${filename}` });
  } catch {
    const filename = `upload-${uploadName}.${extRaw}`;
    await writeFile(join(targetDir, filename), assembled);
    await cleanup(chunkRoot);
    return NextResponse.json({ ok: true, done: true, url: `/images/${folder}/${filename}` });
  }
}

