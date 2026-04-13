export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — загрузить последние сообщения (для восстановления чата при навигации)
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("aray_sid")?.value;

    if (!userId && !sessionId) {
      return NextResponse.json({ messages: [] });
    }

    const where = userId
      ? { userId }
      : { sessionId: sessionId! };

    const messages = await prisma.arayMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 50, // последние 50 сообщений
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("[aray-history] GET error:", e);
    return NextResponse.json({ messages: [] });
  }
}

// POST — сохранить одно сообщение в историю
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("aray_sid")?.value;

    // Для гостей — создаём sessionId если нет
    if (!userId && !sessionId) {
      sessionId = `aray_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      // Cookie будет установлен на клиенте
    }

    const body = await req.json();
    const { role, content, context } = body;

    if (!role || !content) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await prisma.arayMessage.create({
      data: {
        userId: userId || null,
        sessionId: userId ? null : sessionId,
        role,
        content: content.slice(0, 10000), // лимит на длину
        context: context || null,
      },
    });

    // Очистка старых сообщений (оставляем 100 на пользователя)
    const where = userId ? { userId } : { sessionId: sessionId! };
    const count = await prisma.arayMessage.count({ where });
    if (count > 100) {
      const oldest = await prisma.arayMessage.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: count - 100,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.arayMessage.deleteMany({
          where: { id: { in: oldest.map(m => m.id) } },
        });
      }
    }

    const res = NextResponse.json({ ok: true });
    // Установить cookie для гостя
    if (!userId && sessionId) {
      res.cookies.set("aray_sid", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 дней
      });
    }
    return res;
  } catch (e) {
    console.error("[aray-history] POST error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// DELETE — очистить историю чата
export async function DELETE() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("aray_sid")?.value;

    if (!userId && !sessionId) {
      return NextResponse.json({ ok: true });
    }

    const where = userId ? { userId } : { sessionId: sessionId! };
    await prisma.arayMessage.deleteMany({ where });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[aray-history] DELETE error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
