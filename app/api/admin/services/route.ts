import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireManager } from "@/lib/auth-helpers";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  cleanBool,
  cleanInt,
  cleanNullableUrl,
  cleanSlug,
  cleanText,
  parseJsonRecord,
  requireWriteConfirmation,
  sanitizeAdminHtml,
} from "@/lib/admin-content-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();
  const services = await prisma.service.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const title = cleanText(body.title, 180, "Новая услуга");
  const service = await prisma.service.create({
    data: {
      tenantId,
      slug: cleanSlug(body.slug, cleanSlug(title)),
      title,
      description: cleanText(body.description, 700),
      content: sanitizeAdminHtml(body.content),
      price: cleanText(body.price, 120) || null,
      unit: cleanText(body.unit, 80) || null,
      image: cleanNullableUrl(body.image),
      icon: cleanText(body.icon, 80) || null,
      active: cleanBool(body.active, true),
      sortOrder: cleanInt(body.sortOrder, 100, -10000, 10000),
    },
  });
  return NextResponse.json(service);
}
