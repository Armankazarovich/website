export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const workflow = await (prisma as any).workflow.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json({ ok: true, workflow });
  } catch (err) {
    console.error("Workflow PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Delete logs first, then workflow
    await (prisma as any).workflowLog.deleteMany({ where: { workflowId: params.id } });
    await (prisma as any).workflow.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Workflow DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
