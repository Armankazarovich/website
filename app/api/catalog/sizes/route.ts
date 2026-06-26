export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicVariantsFilter } from "@/lib/product-seo";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

function extractCrossSection(size: string): string | null {
  const match = size.match(/^(\d+[×x]\d+)[×x]/);
  return match ? match[1].replace("x", "×") : null;
}

export async function GET() {
  try {
    const variants = await prisma.productVariant.findMany({
      select: { size: true },
      distinct: ["size"],
      where: {
        ...getPublicVariantsFilter(),
        product: {
          tenantId: DEFAULT_TENANT_ID,
          active: true,
          images: { isEmpty: false },
          category: { tenantId: DEFAULT_TENANT_ID, showInMenu: true },
        },
      },
    });

    const crossSections = [
      ...new Set(
        variants
          .map((v) => extractCrossSection(v.size))
          .filter((s): s is string => s !== null)
      ),
    ].sort();

    return NextResponse.json({ sizes: crossSections });
  } catch {
    return NextResponse.json({ sizes: [] });
  }
}
