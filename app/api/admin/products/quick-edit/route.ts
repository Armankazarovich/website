export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const { variantId, pricePerCube, pricePerPiece, inStock } = await req.json();
  if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { tenantId } },
    select: { id: true },
  });
  if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (pricePerCube !== undefined) data.pricePerCube = pricePerCube;
  if (pricePerPiece !== undefined) data.pricePerPiece = pricePerPiece;
  if (inStock !== undefined) data.inStock = inStock;

  await prisma.productVariant.update({ where: { id: variantId }, data });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const { action, productId, active } = await req.json();

  if (action === "toggle_active") {
    const result = await prisma.product.updateMany({ where: { id: productId, tenantId }, data: { active } });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
