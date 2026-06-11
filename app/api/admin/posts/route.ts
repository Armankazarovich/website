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
  const posts = await prisma.post.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const title = cleanText(body.title, 180, "Новая статья");
  const post = await prisma.post.create({
    data: {
      tenantId,
      slug: cleanSlug(body.slug, cleanSlug(title)),
      title,
      excerpt: cleanText(body.excerpt, 500),
      content: sanitizeAdminHtml(body.content),
      coverImage: cleanNullableUrl(body.coverImage),
      published: cleanBool(body.published, false),
      featured: cleanBool(body.featured, false),
      aiGenerated: cleanBool(body.aiGenerated, false),
      topic: cleanText(body.topic, 120) || null,
      readTime: cleanInt(body.readTime, 5, 1, 120),
    },
  });
  return NextResponse.json(post);
}
