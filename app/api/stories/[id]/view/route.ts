import { NextResponse } from "next/server";
import { bumpStoryView } from "@/lib/store-stories";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  await bumpStoryView(params.id);
  return NextResponse.json({ ok: true });
}
