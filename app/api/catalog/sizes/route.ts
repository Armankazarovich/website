export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function extractCrossSection(size: string): string | null {
  const match = size.match(/^(\d+[×x]\d+)[×x]/);
  return match ? match[1].replace("x", "×") : null;
}

export async function GET() {
  try {
    const variants = await prisma.productVariant.findMany({
      select: { size: true },
      distinct: ["size"],
      where: { product: { active: true } },
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
