export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  cleanBool,
  parseJsonRecord,
  requireSearchConfirmation,
  requireWriteConfirmation,
} from "@/lib/admin-content-guard";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const tenantId = getCurrentTenantId();
  const result = await prisma.review.updateMany({
    where: { id: params.id, tenantId },
    data: { approved: cleanBool(body.approved, false) },
  });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const review = await prisma.review.findFirst({ where: { id: params.id, tenantId } });
  return NextResponse.json(review);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const confirmationError = requireSearchConfirmation(req);
  if (confirmationError) return confirmationError;

  const tenantId = getCurrentTenantId();
  const result = await prisma.review.deleteMany({ where: { id: params.id, tenantId } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
