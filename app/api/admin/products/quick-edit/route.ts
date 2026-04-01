export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  return role === "ADMIN" || role === "MANAGER";
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { variantId, pricePerCube, pricePerPiece, inStock } = await req.json();
  if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });

  const data: any = {};
  if (pricePerCube !== undefined) data.pricePerCube = pricePerCube;
  if (pricePerPiece !== undefined) data.pricePerPiece = pricePerPiece;
  if (inStock !== undefined) data.inStock = inStock;

  await prisma.productVariant.update({ where: { id: variantId }, data });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, productId, active } = await req.json();

  if (action === "toggle_active") {
    await prisma.product.update({ where: { id: productId }, data: { active } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
