import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManager, requireStaff } from "@/lib/auth-helpers";
import { buildStoryWrite, storyRelationsInclude } from "@/lib/store-story-admin";

export const dynamic = "force-dynamic";

function revalidateStorySurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/stories");
}

export async function GET() {
  const auth = await requireStaff();
  if (!auth.authorized) return auth.response;

  const stories = await prisma.storeStory.findMany({
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

  const body = await req.json().catch(() => ({}));
  const { data, relations } = buildStoryWrite(body);
  const story = await prisma.storeStory.create({
    data: {
      ...data,
      relations: relations.length > 0 ? { create: relations } : undefined,
    } as any,
    include: storyRelationsInclude,
  });
  revalidateStorySurfaces();

  return NextResponse.json(story);
}
