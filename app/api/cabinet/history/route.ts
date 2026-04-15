export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — user activity history
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Number(searchParams.get("offset") || 0);
  const action = searchParams.get("action"); // filter by action type

  const where: Record<string, unknown> = { userId: session.user.id };
  if (action) where.action = action;

  const [logs, total, stats] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({ where }),
    // Stats by action type
    prisma.activityLog.groupBy({
      by: ["action"],
      where: { userId: session.user.id },
      _count: true,
    }),
  ]);

  const statsMap: Record<string, number> = {};
  for (const s of stats) {
    statsMap[s.action] = s._count;
  }

  return NextResponse.json({ logs, total, stats: statsMap });
}

// POST — log an activity (called from client)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, targetId, meta } = await req.json();

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action,
      targetId: targetId || null,
      meta: meta || null,
    },
  });

  return NextResponse.json({ ok: true });
}
