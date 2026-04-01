import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        saleUnit: true,
        images: true,
        variants: {
          where: { inStock: true },
          select: {
            id: true,
            size: true,
            pricePerCube: true,
            pricePerPiece: true,
            piecesPerCube: true,
          },
          orderBy: { size: "asc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const filtered = products.filter((p) => p.variants.length > 0);
    return NextResponse.json(
      filtered.map((p) => ({
        ...p,
        variants: p.variants.map((v) => ({
          ...v,
          pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
          pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
        })),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
