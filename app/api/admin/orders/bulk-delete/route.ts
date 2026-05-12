export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrdersAdmin } from "@/lib/orders-auth";

export async function DELETE(req: NextRequest) {
  const access = await requireOrdersAdmin();
  if (!access.authorized) return access.response;
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  await prisma.order.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ deleted: ids.length });
}
