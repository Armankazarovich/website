import { NextResponse } from "next/server";
import { getPublicStoreStories } from "@/lib/store-stories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const take = Number(url.searchParams.get("take") || 16);

  const stories = await getPublicStoreStories({
    entityType,
    entityId,
    take,
  });

  return NextResponse.json({ stories });
}
