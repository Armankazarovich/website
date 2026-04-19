export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    const logs = await (prisma as any).workflowLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        workflow: {
          select: { name: true, trigger: true, category: true },
        },
      },
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    if (err.code === "P2021" || err.message?.includes("does not exist")) {
      return NextResponse.json({ logs: [] });
    }
    console.error("Workflow logs GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
