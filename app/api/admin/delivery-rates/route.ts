export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAFF_ROLES = ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

export async function GET() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const rates = await prisma.deliveryRate.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(rates);
}
