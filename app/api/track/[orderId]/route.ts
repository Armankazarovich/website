export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId, deletedAt: null },
    select: {
      status: true,
      updatedAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    { status: order.status, updatedAt: order.updatedAt.toISOString() },
    {
      headers: {
        // Short cache so CDN doesn't hold stale statuses
        "Cache-Control": "no-store",
      },
    }
  );
}
