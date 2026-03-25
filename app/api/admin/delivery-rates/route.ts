export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAFF_ROLES = ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

export async function GET() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const rates = await prisma.deliveryRate.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { vehicleName, payload, maxVolume, basePrice } = body;
  if (!vehicleName || !payload || !maxVolume || !basePrice) {
    return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
  }
  const count = await prisma.deliveryRate.count();
  const rate = await prisma.deliveryRate.create({
    data: {
      vehicleName,
      payload,
      maxVolume: Number(maxVolume),
      basePrice: Number(basePrice),
      sortOrder: count,
    },
  });
  return NextResponse.json(rate, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.deliveryRate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
