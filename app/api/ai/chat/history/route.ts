import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const araySid = cookieStore.get("aray_sid")?.value;

    let userId: string | null = null;
    let sessionId: string | null = null;

    if (session?.user?.id) {
      userId = session.user.id;
    } else if (araySid) {
      sessionId = araySid;
    } else {
      return NextResponse.json({ messages: [] });
    }

    // Автоочистка: удалить сообщения гостей старше 10 дней
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await prisma.arayMessage.deleteMany({
      where: {
        userId: null, // только гости
        createdAt: { lt: tenDaysAgo },
      },
    }).catch(() => {}); // не блокируем если ошибка

    const messages = await prisma.arayMessage.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        role: true,
        content: true,
        context: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[Aray History GET]", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const araySid = cookieStore.get("aray_sid")?.value;

    let userId: string | null = null;
    let sessionId: string | null = null;

    if (session?.user?.id) {
      userId = session.user.id;
    } else if (araySid) {
      sessionId = araySid;
    } else {
      return NextResponse.json({ error: "No user or session" }, { status: 401 });
    }

    const body = await req.json();
    const { role, content, context } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Missing role or content" },
        { status: 400 }
      );
    }

    if (!["user", "assistant"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Create the message
    const message = await prisma.arayMessage.create({
      data: {
        userId,
        sessionId,
        role,
        content,
        context: context || {},
      },
      select: { id: true },
    });

    // Auto-cleanup: if user/session has >100 messages, delete oldest ones (keep last 100)
    const messageCount = await prisma.arayMessage.count({
      where: userId ? { userId } : { sessionId },
    });

    if (messageCount > 100) {
      const toDelete = messageCount - 100;
      const oldMessages = await prisma.arayMessage.findMany({
        where: userId ? { userId } : { sessionId },
        orderBy: { createdAt: "asc" },
        take: toDelete,
        select: { id: true },
      });

      if (oldMessages.length > 0) {
        await prisma.arayMessage.deleteMany({
          where: {
            id: { in: oldMessages.map((m) => m.id) },
          },
        });
      }
    }

    return NextResponse.json({ id: message.id }, { status: 201 });
  } catch (error) {
    console.error("[Aray History POST]", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const araySid = cookieStore.get("aray_sid")?.value;

    let userId: string | null = null;
    let sessionId: string | null = null;

    if (session?.user?.id) {
      userId = session.user.id;
    } else if (araySid) {
      sessionId = araySid;
    } else {
      return NextResponse.json({ error: "No user or session" }, { status: 401 });
    }

    await prisma.arayMessage.deleteMany({
      where: userId ? { userId } : { sessionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Aray History DELETE]", error);
    return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
  }
}
