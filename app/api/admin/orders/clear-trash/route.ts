export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrdersAdmin } from "@/lib/orders-auth";

export async function DELETE() {
  const access = await requireOrdersAdmin();
  if (!access.authorized) return access.response;
  const result = await prisma.order.deleteMany({
    where: { deletedAt: { not: null } },
  });
  return NextResponse.json({ deleted: result.count });
}
