import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const variant = await prisma.productVariant.findFirst({
    where: {
      id,
      ...getPublicVariantsFilter(),
      product: {
        tenantId: DEFAULT_TENANT_ID,
        ...getPublicProductsFilter(),
      },
    },
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
    pricePerSquareMeter: variant.pricePerSquareMeter ? Number(variant.pricePerSquareMeter) : null,
    inStock: variant.inStock,
    image: variant.product.images?.[0] || null,
  });
}
