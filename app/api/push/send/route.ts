export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, body, url } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const result = await sendPushToAll({
    title,
    body,
    icon: "/icons/icon-192x192.png",
    url: url || "/",
  });

  return NextResponse.json(result);
}
