export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER";
}

// POST — создать/импортировать отзыв (из Google, Yandex, VK, 2GIS или вручную)
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const { name, rating, text, source, sourceUrl, externalId, approved, createdAt } = body;

  if (!name || !rating || !text) {
    return NextResponse.json({ error: "name, rating, text — обязательны" }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating должен быть 1–5" }, { status: 400 });
  }

  // Дедупликация по externalId + source
  if (externalId && source) {
    const exists = await prisma.review.findFirst({ where: { externalId, source } });
    if (exists) return NextResponse.json({ duplicate: true, id: exists.id });
  }

  const review = await prisma.review.create({
    data: {
      name: String(name).trim(),
      rating: Number(rating),
      text: String(text).trim(),
      source: source || "internal",
      sourceUrl: sourceUrl || null,
      externalId: externalId || null,
      approved: approved !== false,
      createdAt: createdAt ? new Date(createdAt) : undefined,
    },
  });

  return NextResponse.json({ ok: true, review });
}
