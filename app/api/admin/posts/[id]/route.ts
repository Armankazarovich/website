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
  if (body.excerpt !== undefined) data.excerpt = cleanText(body.excerpt, 500);
  if (body.content !== undefined) data.content = sanitizeAdminHtml(body.content);
  if (body.coverImage !== undefined) data.coverImage = cleanNullableUrl(body.coverImage);
  if (body.published !== undefined) data.published = cleanBool(body.published, false);
  if (body.featured !== undefined) data.featured = cleanBool(body.featured, false);
  if (body.aiGenerated !== undefined) data.aiGenerated = cleanBool(body.aiGenerated, false);
  if (body.topic !== undefined) data.topic = cleanText(body.topic, 120) || null;
  if (body.readTime !== undefined) data.readTime = cleanInt(body.readTime, 5, 1, 120);

  const result = await prisma.post.updateMany({ where: { id: params.id, tenantId }, data });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const post = await prisma.post.findFirst({ where: { id: params.id, tenantId } });
  return NextResponse.json(post);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const confirmationError = requireSearchConfirmation(req);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const result = await prisma.post.deleteMany({ where: { id: params.id, tenantId } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
