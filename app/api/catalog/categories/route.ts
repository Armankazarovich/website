export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { showInMenu: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      children: {
        where: { showInMenu: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, image: true },
      },
    },
  });
  return NextResponse.json({ categories });
}
