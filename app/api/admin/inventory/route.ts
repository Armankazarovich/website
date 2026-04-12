export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && (role === "ADMIN" || role === "SUPER_ADMIN");
}

// PATCH — update stockQty (and auto-update inStock)
export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { variantId, stockQty, pricePerCube, pricePerPiece, inStock } = await req.json();
  if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });

  const updateData: Record<string, unknown> = {};

  // Stock quantity
  if (stockQty !== undefined) {
    updateData.stockQty = stockQty;
    if (stockQty === null) {
      // null = not tracked, don't change inStock
    } else if (stockQty === 0) {
      updateData.inStock = false;
    } else {
      updateData.inStock = true;
    }
  }

  // Prices
  if (pricePerCube !== undefined) updateData.pricePerCube = pricePerCube === "" ? null : pricePerCube;
  if (pricePerPiece !== undefined) updateData.pricePerPiece = pricePerPiece === "" ? null : pricePerPiece;

  // Direct inStock toggle (only when stockQty not provided)
  if (inStock !== undefined && stockQty === undefined) updateData.inStock = inStock;

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: updateData,
  });

  return NextResponse.json({
    ok: true,
    inStock: variant.inStock,
    stockQty: variant.stockQty,
    pricePerCube: variant.pricePerCube,
    pricePerPiece: variant.pricePerPiece,
  });
}
