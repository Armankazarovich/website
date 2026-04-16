import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// POST — upload image file, return URL
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    // Validate MIME type
    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: "Допустимые форматы: JPG, PNG, WebP, GIF" }, { status: 400 });
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
    const filename = `review-${randomUUID().slice(0, 8)}.${ext}`;

    // Save to public/uploads/reviews/ (persists on VPS across deploys)
    const uploadDir = path.join(process.cwd(), "public", "uploads", "reviews");
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/api/uploads/reviews/${filename}`;

    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}
