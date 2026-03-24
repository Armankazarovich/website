export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const count = await prisma.pushSubscription.count();
  const withUser = await prisma.pushSubscription.count({ where: { userId: { not: null } } });
  const recent = await prisma.pushSubscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { createdAt: true, userId: true, endpoint: true },
  });

  return NextResponse.json({
    count,
    withUser,
    guests: count - withUser,
    vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    publicKeyPrefix: process.env.VAPID_PUBLIC_KEY ? process.env.VAPID_PUBLIC_KEY.slice(0, 12) + "..." : "NOT SET",
    nextPublicKeySet: !!process.env.NEXT_PUBLIC_VAPID_KEY,
    recent: recent.map((r) => ({
      ago: Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000) + "m ago",
      hasUser: !!r.userId,
      endpointShort: r.endpoint.slice(-20),
    })),
  });
}
