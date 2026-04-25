export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

// Разрешённые action для записи клиентом (защита от спама)
const ALLOWED_ACTIONS = new Set([
  "VIEW_PRODUCT",
  "PLACE_ORDER",
  "WRITE_REVIEW",
  "LOGIN",
  "PAGE_VISIT",
  "CANCEL_ORDER",
  "REPEAT_ORDER",
  "SUBSCRIBE",
  "UNSUBSCRIBE",
]);

// POST — log an activity (called from client)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, targetId, meta } = await req.json();

  if (!action || typeof action !== "string") {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Ограничиваем meta — максимум 10 ключей, значения — только примитивы короче 500 символов
  let safeMeta: Record<string, unknown> | null = null;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    safeMeta = {};
    let keys = 0;
    for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
      if (keys >= 10) break;
      if (typeof k !== "string" || k.length > 50) continue;
      if (typeof v === "string") {
        safeMeta[k] = v.slice(0, 500);
      } else if (typeof v === "number" || typeof v === "boolean") {
        safeMeta[k] = v;
      }
      keys++;
    }
  }

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action,
      targetId: typeof targetId === "string" ? targetId.slice(0, 100) : null,
      ...(safeMeta ? { meta: safeMeta as Prisma.InputJsonValue } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
