export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "MANAGER";
}

// POST /api/admin/products/bulk-price
// Body: { productIds: string[], percent: number }
// percent: +10 = +10%, -5 = -5%
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productIds, percent } = await req.json();
  if (!productIds?.length || percent === undefined) {
    return NextResponse.json({ error: "productIds and percent required" }, { status: 400 });
  }

  const numPercent = Number(percent);
  if (isNaN(numPercent) || numPercent < -50 || numPercent > 200) {
    return NextResponse.json({ error: "Процент должен быть от -50% до +200%" }, { status: 400 });
  }

  const multiplier = 1 + numPercent / 100;

  // Get all variants for selected products
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds } },
    select: { id: true, pricePerCube: true, pricePerPiece: true },
  });

  // Update each variant — round to nearest 50
  const round50 = (n: number) => Math.round(n / 50) * 50;

  await Promise.all(
    variants.map((v) => {
      const data: any = {};
      if (v.pricePerCube) data.pricePerCube = round50(Number(v.pricePerCube) * multiplier);
      if (v.pricePerPiece) data.pricePerPiece = round50(Number(v.pricePerPiece) * multiplier);
      return prisma.productVariant.update({ where: { id: v.id }, data });
    })
  );

  return NextResponse.json({ ok: true, updated: variants.length });
}
