export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

function getUserBgKey(userId: string) {
  return `user_bg_${userId}`;
}

async function getStaffSession() {
  const session = await auth();
  const role = (session?.user as any)?.role as string;
  const userId = (session?.user as any)?.id as string;
  if (!session || !role || role === "USER" || !userId) return null;
  return { userId, role };
}

// ── GET: получить список фото фона пользователя ──────────────────────────────
export async function GET() {
  const sess = await getStaffSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.siteSettings.findUnique({
    where: { key: getUserBgKey(sess.userId) },
  }).catch(() => null);

  const photos: string[] = row ? JSON.parse(row.value) : [];
  return NextResponse.json({ photos });
}

// ── POST: загрузить новое фото ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const sess = await getStaffSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const MAX = 5; // максимум 5 фото на пользователя
  const key = getUserBgKey(sess.userId);

  const row = await prisma.siteSettings.findUnique({ where: { key } }).catch(() => null);
  const existing: string[] = row ? JSON.parse(row.value) : [];

  if (existing.length >= MAX) {
    return NextResponse.json({ error: `Максимум ${MAX} фото. Удали старое.` }, { status: 400 });
  }

  // Сохраняем файл
  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);
  const dir = join(process.cwd(), "public", "images", "backgrounds", sess.userId);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const timestamp = Date.now();
  let url: string;

  try {
    const sharp = (await import("sharp")).default;
    const optimized = await sharp(inputBuffer)
      .resize(1920, 1080, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const filename = `bg-${timestamp}.webp`;
    await writeFile(join(dir, filename), optimized);
    url = `/images/backgrounds/${sess.userId}/${filename}`;
  } catch {
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `bg-${timestamp}.${ext}`;
    await writeFile(join(dir, filename), inputBuffer);
    url = `/images/backgrounds/${sess.userId}/${filename}`;
  }

  // Сохраняем в SiteSettings
  const updated = [...existing, url];
  await prisma.siteSettings.upsert({
    where: { key },
    create: { key, value: JSON.stringify(updated) },
    update: { value: JSON.stringify(updated) },
  });

  return NextResponse.json({ url, photos: updated });
}

// ── DELETE: удалить фото ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const sess = await getStaffSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  const key = getUserBgKey(sess.userId);

  const row = await prisma.siteSettings.findUnique({ where: { key } }).catch(() => null);
  const existing: string[] = row ? JSON.parse(row.value) : [];

  const updated = existing.filter(u => u !== url);
  await prisma.siteSettings.upsert({
    where: { key },
    create: { key, value: JSON.stringify(updated) },
    update: { value: JSON.stringify(updated) },
  });

  // Удаляем файл с диска (только локальные)
  if (url.startsWith("/images/")) {
    try {
      const { unlink } = await import("fs/promises");
      await unlink(join(process.cwd(), "public", url));
    } catch {}
  }

  return NextResponse.json({ photos: updated });
}
