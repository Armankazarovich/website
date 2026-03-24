export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [minResult, maxResult] = await Promise.all([
    prisma.productVariant.aggregate({
      where: { product: { active: true }, pricePerCube: { gt: 0 } },
      _min: { pricePerCube: true },
    }),
    prisma.productVariant.aggregate({
      where: { product: { active: true }, pricePerCube: { gt: 0 } },
      _max: { pricePerCube: true },
    }),
  ]);

  const min = Math.floor(Number(minResult._min.pricePerCube ?? 0) / 1000) * 1000;
  const max = Math.ceil(Number(maxResult._max.pricePerCube ?? 100000) / 1000) * 1000;

  return NextResponse.json({ min, max });
}
