export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  cleanBool,
  cleanInt,
  cleanNullableUrl,
  cleanText,
  parseJsonRecord,
  requireWriteConfirmation,
} from "@/lib/admin-content-guard";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = new URL(req.url);
  const pending = url.searchParams.get("pending") === "true";
  const limitParam = url.searchParams.get("limit");
  const tenantId = getCurrentTenantId();
  const where: any = { tenantId };
  if (pending) where.approved = false;

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(limitParam ? { take: Math.min(parseInt(limitParam, 10) || 50, 100) } : {}),
    select: {
      id: true,
      name: true,
      rating: true,
      text: true,
      source: true,
      approved: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const tenantId = getCurrentTenantId();
  const cleanName = cleanText(body.name, 120);
  const cleanReviewText = cleanText(body.text, 2000);
  const cleanRating = cleanInt(body.rating, 0, 1, 5);
  if (!cleanName || !cleanReviewText || !cleanRating) {
    return NextResponse.json({ error: "name, rating, text are required" }, { status: 400 });
  }

  const source = cleanText(body.source, 80, "internal");
  const externalId = cleanText(body.externalId, 160);
  if (externalId && source) {
    const exists = await prisma.review.findFirst({ where: { tenantId, externalId, source } });
    if (exists) return NextResponse.json({ duplicate: true, id: exists.id });
  }

  const createdAt = cleanText(body.createdAt, 80);
  const createdDate = createdAt ? new Date(createdAt) : null;
  const review = await prisma.review.create({
    data: {
      tenantId,
      name: cleanName,
      rating: cleanRating,
      text: cleanReviewText,
      source,
      sourceUrl: cleanNullableUrl(body.sourceUrl),
      externalId: externalId || null,
      approved: cleanBool(body.approved, true),
      createdAt: createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate : undefined,
    },
  });

  return NextResponse.json({ ok: true, review });
}
