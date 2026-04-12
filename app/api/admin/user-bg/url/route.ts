export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getUserBgKey(userId: string) {
  return `user_bg_${userId}`;
}

// POST /api/admin/user-bg/url — добавить URL (например Unsplash) без загрузки файла
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role as string;
  const userId = session?.user?.id as string;

  if (!session || !role || role === "USER" || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Нет URL" }, { status: 400 });
  }

  const key = getUserBgKey(userId);
  const row = await prisma.siteSettings.findUnique({ where: { key } }).catch(() => null);
  const existing: string[] = row ? JSON.parse(row.value) : [];

  if (existing.length >= 5) {
    return NextResponse.json({ error: "Максимум 5 фото. Удали старое." }, { status: 400 });
  }

  if (existing.includes(url)) {
    return NextResponse.json({ photos: existing }); // уже есть
  }

  const updated = [...existing, url];
  await prisma.siteSettings.upsert({
    where: { key },
    create: { key, value: JSON.stringify(updated) },
    update: { value: JSON.stringify(updated) },
  });

  return NextResponse.json({ photos: updated });
}
