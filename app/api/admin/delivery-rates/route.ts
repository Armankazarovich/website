export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "COURIER",
  "ACCOUNTANT",
  "WAREHOUSE",
  "SELLER",
];
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

export async function GET() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const rates = await prisma.deliveryRate.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await readJson(req);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { vehicleName, payload, maxVolume, basePrice } = body;
  const volume = readPositiveNumber(maxVolume);
  const price = readPositiveNumber(basePrice);
  if (
    typeof vehicleName !== "string" ||
    !vehicleName.trim() ||
    typeof payload !== "string" ||
    !payload.trim() ||
    volume === null ||
    price === null
  ) {
    return NextResponse.json(
      { error: "Все поля обязательны" },
      { status: 400 },
    );
  }
  const count = await prisma.deliveryRate.count();
  const rate = await prisma.deliveryRate.create({
    data: {
      vehicleName: vehicleName.trim(),
      payload: payload.trim(),
      maxVolume: volume,
      basePrice: price,
      sortOrder: count,
    },
  });
  return NextResponse.json(rate, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const deleted = await prisma.deliveryRate.deleteMany({ where: { id } });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Тариф не найден" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
