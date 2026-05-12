export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit("cabinet-avatar", 10, 60_000);
const AVATAR_MAX_SIZE = 10 * 1024 * 1024;
const AVATAR_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validateImageMagic(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mime === "image/gif") return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  if (mime === "image/webp") {
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function fallbackExt(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

// POST — upload avatar
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  if (!limiter.check(session.user.id)) {
    return NextResponse.json(
      { error: "Слишком часто. Попробуйте через минуту." },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    if (!AVATAR_MIME.includes(file.type)) {
      return NextResponse.json({ error: "Поддерживаются JPG, PNG, WebP или GIF" }, { status: 400 });
    }

    if (file.size > AVATAR_MAX_SIZE) {
      return NextResponse.json({ error: "Максимальный размер 10MB" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateImageMagic(buffer, file.type)) {
      return NextResponse.json({ error: "Файл не похож на корректное изображение" }, { status: 400 });
    }

    // Optimize to WebP (256x256 avatar)
    let filename: string;
    try {
      const sharp = (await import("sharp")).default;
      const optimized = await sharp(buffer)
        .resize(256, 256, { fit: "cover" })
        .webp({ quality: 85 })
        .toBuffer();
      filename = `avatar-${session.user.id.slice(0, 8)}-${randomUUID().slice(0, 6)}.webp`;
      await writeFile(path.join(uploadDir, filename), optimized);
    } catch {
      const ext = fallbackExt(file.type);
      filename = `avatar-${session.user.id.slice(0, 8)}-${randomUUID().slice(0, 6)}.${ext}`;
      await writeFile(path.join(uploadDir, filename), buffer);
    }

    const avatarUrl = `/api/uploads/avatars/${filename}`;

    // Update user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });

    return NextResponse.json({ ok: true, avatarUrl }, { status: 200 });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

// DELETE — remove avatar
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true });
}
