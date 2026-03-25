export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { vehicleName, payload, maxVolume, basePrice } = body;

  const updated = await prisma.deliveryRate.update({
    where: { id: params.id },
    data: {
      ...(vehicleName !== undefined && { vehicleName }),
      ...(payload !== undefined && { payload }),
      ...(maxVolume !== undefined && { maxVolume: Number(maxVolume) }),
      ...(basePrice !== undefined && { basePrice: Number(basePrice) }),
    },
  });
  return NextResponse.json(updated);
}
