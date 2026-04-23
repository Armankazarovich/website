import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

// Public review upload endpoint.
// Allows guest uploads (for review photos) but with strict rate limits.
// Authenticated users get higher limits.

const guestLimiter = rateLimit("upload-guest", 5, 60 * 60 * 1000); // 5/hour
const userLimiter = rateLimit("upload-user", 30, 60 * 60 * 1000); // 30/hour

// Magic number validation — real file signatures
function validateImageMagic(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mime === "image/png")
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  // GIF: 47 49 46 38 (GIF8)
  if (mime === "image/gif")
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  // WebP: RIFF....WEBP
  if (mime === "image/webp")
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  return false;
}

// POST — upload image file, auto-optimize to WebP
export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP + session-aware
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const limiter = userId ? userLimiter : guestLimiter;
    if (!limiter.check(key)) {
      return NextResponse.json(
        { error: "Слишком много загрузок. Попробуйте через час." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    // Honeypot field for bots
    const honeypot = formData.get("website");
    if (honeypot && String(honeypot).trim() !== "") {
      // Pretend success to bot but don't save
      return NextResponse.json({ ok: true, url: "/placeholder.png" }, { status: 201 });
    }

    // Validate MIME type
    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: "Допустимые форматы: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Максимальный размер 5MB" }, { status: 400 });
    }

    // Validate & whitelist extension
    const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json({ error: "Недопустимое расширение файла" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate magic number — real image not MIME-spoofed
    if (!validateImageMagic(buffer, file.type)) {
      return NextResponse.json(
        { error: "Файл не является валидным изображением" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "reviews");
    await mkdir(uploadDir, { recursive: true });

    // Optimize to WebP via sharp (resize + compress)
    try {
      const sharp = (await import("sharp")).default;
      const optimized = await sharp(buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      // Full UUID for zero collision chance
      const filename = `review-${randomUUID()}.webp`;
      await writeFile(path.join(uploadDir, filename), optimized);
      const url = `/api/uploads/reviews/${filename}`;
      return NextResponse.json({ ok: true, url }, { status: 201 });
    } catch {
      // Sharp unavailable — save original with safe extension
      const filename = `review-${randomUUID()}.${ext}`;
      await writeFile(path.join(uploadDir, filename), buffer);
      const url = `/api/uploads/reviews/${filename}`;
      return NextResponse.json({ ok: true, url }, { status: 201 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}
