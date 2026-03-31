export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

// PATCH — update stockQty (and auto-update inStock)
export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { variantId, stockQty } = await req.json();
  if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });

  const updateData: { stockQty: number | null; inStock?: boolean } = {
    stockQty: stockQty === undefined ? null : stockQty,
  };

  // Auto-sync inStock with stockQty
  if (stockQty === null || stockQty === undefined) {
    // null = not tracked → keep inStock as-is
  } else if (stockQty === 0) {
    updateData.inStock = false;
  } else {
    updateData.inStock = true;
  }

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: updateData,
  });

  return NextResponse.json({
    ok: true,
    inStock: variant.inStock,
    stockQty: variant.stockQty,
  });
}
