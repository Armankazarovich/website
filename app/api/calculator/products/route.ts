import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicVariantsFilter } from "@/lib/product-seo";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

function calculatorUnitRank(product: { saleUnit: string; variants: Array<{ pricePerCube: unknown; pricePerPiece: unknown; pricePerSquareMeter: unknown }> }) {
  const variant = product.variants[0];
  if (!variant) return 99;
  if (product.saleUnit !== "PIECE" && Number(variant.pricePerCube) > 0) return 0;
  if (product.saleUnit !== "CUBE" && Number(variant.pricePerPiece) > 0) return 1;
  if (Number(variant.pricePerSquareMeter) > 0) return 2;
  return 99;
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        active: true,
        images: { isEmpty: false },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        saleUnit: true,
        images: true,
        variants: {
          where: getPublicVariantsFilter(),
          select: {
            id: true,
            size: true,
            pricePerCube: true,
            pricePerPiece: true,
            pricePerSquareMeter: true,
            piecesPerCube: true,
          },
          orderBy: { size: "asc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const filtered = products
      .filter((p) => p.variants.length > 0)
      .sort((a, b) => calculatorUnitRank(a) - calculatorUnitRank(b) || a.name.localeCompare(b.name, "ru"));
    return NextResponse.json(
      filtered.map((p) => ({
        ...p,
        variants: p.variants.map((v) => ({
          ...v,
          pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
          pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
          pricePerSquareMeter: v.pricePerSquareMeter ? Number(v.pricePerSquareMeter) : null,
        })),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
