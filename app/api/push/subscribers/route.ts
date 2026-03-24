export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const subs = await prisma.pushSubscription.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          _count: { select: { orders: true } },
          orders: {
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    subs.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      isRegistered: !!s.userId,
      name: s.user?.name || "Гость",
      email: s.user?.email || null,
      phone: s.user?.phone || null,
      lastOrderAt: s.user?.orders[0]?.createdAt || null,
      ordersCount: s.user?._count?.orders ?? 0,
    }))
  );
}
