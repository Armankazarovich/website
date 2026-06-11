import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { buildStoryWrite, storyRelationsInclude } from "@/lib/store-story-admin";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  parseJsonRecord,
  requireSearchConfirmation,
  requireWriteConfirmation,
} from "@/lib/admin-content-guard";

export const dynamic = "force-dynamic";

function revalidateStorySurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/stories");
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const { data, relations } = buildStoryWrite(body);
  const story = await prisma.$transaction(async (tx) => {
    const updated = await tx.storeStory.updateMany({
      where: { id: params.id, tenantId },
      data: data as any,
    });
    if (!updated.count) return null;
    await tx.storeStoryRelation.deleteMany({ where: { storyId: params.id, tenantId } });
    if (relations.length > 0) {
      await tx.storeStoryRelation.createMany({
        data: relations.map((relation) => ({ ...relation, storyId: params.id, tenantId })),
        skipDuplicates: true,
      });
    }
    return tx.storeStory.findFirst({
      where: { id: params.id, tenantId },
      include: storyRelationsInclude,
    });
  });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateStorySurfaces();

  return NextResponse.json(story);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const confirmationError = requireSearchConfirmation(req);
  if (confirmationError) return confirmationError;
  const tenantId = getCurrentTenantId();
  const result = await prisma.storeStory.deleteMany({ where: { id: params.id, tenantId } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateStorySurfaces();
  return NextResponse.json({ ok: true });
}
