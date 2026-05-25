import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { buildStoryWrite, storyRelationsInclude } from "@/lib/store-story-admin";

export const dynamic = "force-dynamic";

function revalidateStorySurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/stories");
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { data, relations } = buildStoryWrite(body);
  const story = await prisma.$transaction(async (tx) => {
    await tx.storeStoryRelation.deleteMany({ where: { storyId: params.id } });
    await tx.storeStory.update({
      where: { id: params.id },
      data: data as any,
    });
    if (relations.length > 0) {
      await tx.storeStoryRelation.createMany({
        data: relations.map((relation) => ({ ...relation, storyId: params.id })),
        skipDuplicates: true,
      });
    }
    return tx.storeStory.findUnique({
      where: { id: params.id },
      include: storyRelationsInclude,
    });
  });
  revalidateStorySurfaces();

  return NextResponse.json(story);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  await prisma.storeStory.delete({ where: { id: params.id } });
  revalidateStorySurfaces();
  return NextResponse.json({ ok: true });
}
