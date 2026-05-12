export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: Prisma.PromotionUpdateInput = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    data.title = body.title.trim();
  }

  if (body.description !== undefined)
    data.description =
      typeof body.description === "string" ? body.description : "";

  if (body.discount !== undefined) {
    const discount = parseNullableNumber(body.discount);
    if (discount === undefined)
      return NextResponse.json({ error: "Invalid discount" }, { status: 400 });
    data.discount = discount;
  }

  if (body.imageUrl !== undefined)
    data.imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

  if (body.validUntil !== undefined) {
    const validUntil = parseNullableDate(body.validUntil);
    if (validUntil === undefined)
      return NextResponse.json(
        { error: "Invalid validUntil" },
        { status: 400 },
      );
    data.validUntil = validUntil;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean")
      return NextResponse.json({ error: "Invalid active" }, { status: 400 });
    data.active = body.active;
  }

  const promotion = await prisma.promotion.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(promotion);
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.promotion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
