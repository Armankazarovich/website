export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseNullableDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const stringValue = String(value);
  const dateOnly = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dateValue = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        23,
        59,
        59,
        999,
      )
    : new Date(stringValue);
  if (!dateOnly) dateValue.setHours(23, 59, 59, 999);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
}

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(promotions);
}

export async function POST(req: Request) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, description, discount, imageUrl, validUntil, active } =
    await req.json();
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const cleanDiscount = parseNullableNumber(discount);
  const cleanValidUntil = parseNullableDate(validUntil);

  if (!cleanTitle)
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (cleanDiscount === undefined)
    return NextResponse.json({ error: "Invalid discount" }, { status: 400 });
  if (cleanValidUntil === undefined)
    return NextResponse.json({ error: "Invalid validUntil" }, { status: 400 });
  if (active !== undefined && typeof active !== "boolean")
    return NextResponse.json({ error: "Invalid active" }, { status: 400 });

  const promotion = await prisma.promotion.create({
    data: {
      title: cleanTitle,
      description: typeof description === "string" ? description : "",
      discount: cleanDiscount,
      imageUrl:
        typeof imageUrl === "string" && imageUrl.trim()
          ? imageUrl.trim()
          : null,
      validUntil: cleanValidUntil,
      active: active ?? true,
    },
  });
  return NextResponse.json(promotion);
}
