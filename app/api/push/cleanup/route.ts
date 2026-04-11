export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Оставляем максимум MAX_PER_USER подписок на пользователя (самые новые)
// Гостевые подписки не трогаем (нет userId)
const MAX_PER_USER = 3;

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Находим всех зарегистрированных пользователей с подписками
  const grouped = await prisma.pushSubscription.groupBy({
    by: ["userId"],
    where: { userId: { not: null } },
    _count: { id: true },
    having: { id: { _count: { gt: MAX_PER_USER } } },
  });

  let deleted = 0;

  for (const group of grouped) {
    if (!group.userId) continue;

    // Получаем все подписки этого пользователя, самые новые первыми
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: group.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    // Удаляем все кроме первых MAX_PER_USER
    const toDelete = subs.slice(MAX_PER_USER).map((s) => s.id);
    if (toDelete.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: toDelete } },
      });
      deleted += toDelete.length;
    }
  }

  return NextResponse.json({ deleted, message: `Удалено ${deleted} устаревших подписок` });
}
