export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { variants: { some: { size: { contains: q, mode: "insensitive" } } } },
      ],
    },
    include: {
      category: { select: { name: true } },
      variants: {
        select: { pricePerCube: true, pricePerPiece: true },
        orderBy: { pricePerCube: "asc" },
        take: 1,
      },
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    results: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      images: p.images,
      saleUnit: p.saleUnit,
      variants: p.variants.map((v) => ({
        pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
        pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
      })),
    })),
  });
}
