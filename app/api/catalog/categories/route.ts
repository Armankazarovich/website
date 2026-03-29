export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { sortOrder: { lt: 900 } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ categories });
}
