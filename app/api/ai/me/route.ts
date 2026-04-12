export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("aray_sid")?.value;

    let memory = null;
    let user = null;

    if (userId) {
      [user, memory] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true, role: true, orders: { where: { status: { notIn: ["CANCELLED"] } }, select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 } },
        }),
        prisma.arayMemory.findUnique({ where: { userId } }),
      ]);
    } else if (sessionId) {
      memory = await prisma.arayMemory.findUnique({ where: { sessionId } });
    }

    const levelLabels: Record<string, { label: string; next: string; color: string; points: number; nextPoints: number }> = {
      NOVICE:  { label: "Новичок",        next: "Строитель", color: "#60a5fa", points: 0,   nextPoints: 300 },
      BUILDER: { label: "Строитель",      next: "Мастер",    color: "#34d399", points: 300, nextPoints: 1000 },
      MASTER:  { label: "Мастер",         next: "Партнёр",   color: "#f59e0b", points: 1000, nextPoints: 2500 },
      PARTNER: { label: "Партнёр ARAY",   next: "",          color: "#a78bfa", points: 2500, nextPoints: 2500 },
    };

    const level = memory?.level || "NOVICE";
    const levelInfo = levelLabels[level];

    return NextResponse.json({
      authenticated: !!userId,
      name: user?.name || (memory?.facts as any)?.имя || null,
      email: user?.email || null,
      role: user?.role || null,
      level,
      levelInfo,
      totalChats: memory?.totalChats || 0,
      totalPoints: memory?.totalPoints || 0,
      facts: memory?.facts || {},
      recentOrders: user?.orders || [],
    });
  } catch (err) {
    console.error("[/api/ai/me]", err);
    return NextResponse.json({ authenticated: false, name: null, level: "NOVICE" });
  }
}
