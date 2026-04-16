export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRODUCTS_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

async function checkCategoryRead() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && role && PRODUCTS_ROLES.includes(role);
}

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && (role === "ADMIN" || role === "SUPER_ADMIN");
}

export async function GET() {
  if (!(await checkCategoryRead())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
