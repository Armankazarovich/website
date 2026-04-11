export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && session.user.role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, slug, image, sortOrder, parentId, seoTitle, seoDescription, showInMenu, showInFooter } = await req.json();
  const category = await prisma.category.create({
    data: {
      name,
      slug,
      image: image || null,
      sortOrder: sortOrder ?? 0,
      parentId: parentId || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      showInMenu: showInMenu !== false,
      showInFooter: showInFooter !== false,
    },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(category);
}
