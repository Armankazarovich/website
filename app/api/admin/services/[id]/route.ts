import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  cleanBool,
  cleanInt,
  cleanNullableUrl,
  cleanSlug,
  cleanText,
  parseJsonRecord,
  requireSearchConfirmation,
  requireWriteConfirmation,
  sanitizeAdminHtml,
} from "@/lib/admin-content-guard";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const data: Record<string, unknown> = {};

  if (body.slug !== undefined) data.slug = cleanSlug(body.slug);
  if (body.title !== undefined) {
    const title = cleanText(body.title, 180);
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    data.title = title;
  }
  if (body.description !== undefined) data.description = cleanText(body.description, 700);
  if (body.content !== undefined) data.content = sanitizeAdminHtml(body.content);
  if (body.price !== undefined) data.price = cleanText(body.price, 120) || null;
  if (body.unit !== undefined) data.unit = cleanText(body.unit, 80) || null;
  if (body.image !== undefined) data.image = cleanNullableUrl(body.image);
  if (body.icon !== undefined) data.icon = cleanText(body.icon, 80) || null;
  if (body.active !== undefined) data.active = cleanBool(body.active, true);
  if (body.sortOrder !== undefined) data.sortOrder = cleanInt(body.sortOrder, 100, -10000, 10000);

  const result = await prisma.service.updateMany({ where: { id: params.id, tenantId }, data });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const service = await prisma.service.findFirst({ where: { id: params.id, tenantId } });
  return NextResponse.json(service);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const confirmationError = requireSearchConfirmation(req);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const result = await prisma.service.deleteMany({ where: { id: params.id, tenantId } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
