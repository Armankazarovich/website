import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, slug: true, images: true },
      },
    },
  });

  if (!variant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: variant.id,
    productId: variant.product.id,
    productName: variant.product.name,
    productSlug: variant.product.slug,
    size: variant.size,
    pricePerCube: variant.pricePerCube ? Number(variant.pricePerCube) : null,
    pricePerPiece: variant.pricePerPiece ? Number(variant.pricePerPiece) : null,
    inStock: variant.inStock,
    image: variant.product.images?.[0] || null,
  });
}
