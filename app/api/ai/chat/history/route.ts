import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function getIdentity() {
  const session = await auth();
  const userId = session?.user?.id || null;
  if (userId) return { userId, sessionId: null };

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("aray_sid")?.value || null;
  return { userId: null, sessionId };
}

export async function GET() {
  try {
    const { userId, sessionId } = await getIdentity();
    if (!userId && !sessionId) return NextResponse.json({ messages: [] });

    // Автоочистка гостей старше 10 дней (фоново)
    prisma.arayMessage.deleteMany({
      where: { userId: null, createdAt: { lt: new Date(Date.now() - 10 * 86400000) } },
    }).catch(() => {});

    const messages = await prisma.arayMessage.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true, role: true, content: true, context: true, createdAt: true },
    });

    return NextResponse.json({ messages });
  } catch (e: any) {
    console.error("[Aray History GET]", e?.message?.slice(0, 200));
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId } = await getIdentity();
    if (!userId && !sessionId) return NextResponse.json({ id: "no-auth" });

    const { role, content, context } = await req.json();
    if (!role || !content || !["user", "assistant"].includes(role)) {
      return NextResponse.json({ id: "invalid" });
    }

    const message = await prisma.arayMessage.create({
      data: { userId, sessionId, role, content, context: context || {} },
      select: { id: true },
    });

    // Автоочистка: >100 сообщений → удаляем старые
    const count = await prisma.arayMessage.count({
      where: userId ? { userId } : { sessionId },
    });
    if (count > 100) {
      const old = await prisma.arayMessage.findMany({
        where: userId ? { userId } : { sessionId },
        orderBy: { createdAt: "asc" },
        take: count - 100,
        select: { id: true },
      });
      if (old.length) {
        await prisma.arayMessage.deleteMany({ where: { id: { in: old.map(m => m.id) } } });
      }
    }

    return NextResponse.json({ id: message.id }, { status: 201 });
  } catch (e: any) {
    console.warn("[Aray History POST]", e?.message?.slice(0, 200));
    return NextResponse.json({ id: "error" });
  }
}

export async function DELETE() {
  try {
    const { userId, sessionId } = await getIdentity();
    if (!userId && !sessionId) return NextResponse.json({ ok: true });

    await prisma.arayMessage.deleteMany({
      where: userId ? { userId } : { sessionId },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.warn("[Aray History DELETE]", e?.message?.slice(0, 200));
    return NextResponse.json({ ok: true });
  }
}
