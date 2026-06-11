export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant-context";

const WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

async function readJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function readPositiveNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const tenantId = getCurrentTenantId();
  const body = await readJson(req);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  if ((body as Record<string, unknown>).confirm !== true) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }
  const { vehicleName, payload, maxVolume, basePrice } = body;
  const data: {
    vehicleName?: string;
    payload?: string;
    maxVolume?: number;
    basePrice?: number;
  } = {};

  if (vehicleName !== undefined) {
    if (typeof vehicleName !== "string" || !vehicleName.trim()) {
      return NextResponse.json(
        { error: "Название транспорта обязательно" },
        { status: 400 },
      );
    }
    data.vehicleName = vehicleName.trim();
  }
  if (payload !== undefined) {
    if (typeof payload !== "string" || !payload.trim()) {
      return NextResponse.json(
        { error: "Грузоподъёмность обязательна" },
        { status: 400 },
      );
    }
    data.payload = payload.trim();
  }
  if (maxVolume !== undefined) {
    const volume = readPositiveNumber(maxVolume);
    if (volume === null) {
      return NextResponse.json(
        { error: "Объём должен быть числом больше 0" },
        { status: 400 },
      );
    }
    data.maxVolume = volume;
  }
  if (basePrice !== undefined) {
    const price = readPositiveNumber(basePrice);
    if (price === null) {
      return NextResponse.json(
        { error: "Цена должна быть числом больше 0" },
        { status: 400 },
      );
    }
    data.basePrice = price;
  }

  const exists = await prisma.deliveryRate.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Тариф не найден" }, { status: 404 });
  }

  const updated = await prisma.deliveryRate.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}
