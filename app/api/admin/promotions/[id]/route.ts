export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  cleanLongText,
  cleanNullableUrl,
  cleanText,
  parseJsonRecord,
  requireSearchConfirmation,
  requireWriteConfirmation,
} from "@/lib/admin-content-guard";

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
  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const data: Prisma.PromotionUpdateInput = {};

  if (body.title !== undefined) {
    const title = cleanText(body.title, 160);
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    data.title = title;
  }

  if (body.description !== undefined)
    data.description = cleanLongText(body.description, 2000);

  if (body.discount !== undefined) {
    const discount = parseNullableNumber(body.discount);
    if (discount === undefined)
      return NextResponse.json({ error: "Invalid discount" }, { status: 400 });
    data.discount = discount;
  }

  if (body.imageUrl !== undefined)
    data.imageUrl = cleanNullableUrl(body.imageUrl);

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

  const result = await prisma.promotion.updateMany({
    where: { id: params.id, tenantId },
    data,
  });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const promotion = await prisma.promotion.findFirst({
    where: { id: params.id, tenantId },
  });
  return NextResponse.json(promotion);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const confirmationError = requireSearchConfirmation(req);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const result = await prisma.promotion.deleteMany({ where: { id: params.id, tenantId } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
