export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    nextPublicVapidSet: !!process.env.NEXT_PUBLIC_VAPID_KEY,
    vapidPublicSet: !!process.env.VAPID_PUBLIC_KEY,
    nodeVersion: process.version,
    platform: process.platform,
    cwd: process.cwd(),
    uptime: Math.round(process.uptime()) + "s",
  });
}
