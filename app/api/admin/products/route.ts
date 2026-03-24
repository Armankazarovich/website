export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, slug, description, categoryId, images, saleUnit, active, featured } = body;

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      categoryId,
      images: images || [],
      saleUnit: saleUnit || "BOTH",
      active: active ?? true,
      featured: featured ?? false,
    },
    include: { category: true, variants: true },
  });
  return NextResponse.json(product);
}
