import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManager, requireStaff } from "@/lib/auth-helpers";
import { buildStoryWrite, storyRelationsInclude } from "@/lib/store-story-admin";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";

export const dynamic = "force-dynamic";

function revalidateStorySurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/stories");
}

export async function GET() {
  const auth = await requireStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const stories = await prisma.storeStory.findMany({
    where: { tenantId },
    include: storyRelationsInclude,
    orderBy: [
      { pinned: "desc" },
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(stories);
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const { data, relations } = buildStoryWrite(body);
  const story = await prisma.storeStory.create({
    data: {
      ...data,
      tenantId,
      relations: relations.length > 0 ? { create: relations.map((relation) => ({ ...relation, tenantId })) } : undefined,
    } as any,
    include: storyRelationsInclude,
  });
  revalidateStorySurfaces();

  return NextResponse.json(story);
}
