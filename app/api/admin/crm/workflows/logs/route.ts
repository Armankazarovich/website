/**
 * CRM Workflow Logs — последние исполнения роботов
 * GET ?limit=50&workflowId=xxx
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireManager();
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const workflowId = searchParams.get("workflowId");

  try {
    const where: any = {};
    if (workflowId) where.workflowId = workflowId;

    const logs = await prisma.workflowLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        workflow: { select: { name: true, trigger: true, category: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (e: any) {
    return NextResponse.json({ logs: [] });
  }
}
