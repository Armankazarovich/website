export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role as string);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid workflow payload" }, { status: 400 });
  }

  const existing = await prisma.workflow.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const data: Prisma.WorkflowUpdateInput = {};
  const payload = body as Record<string, unknown>;
  if (payload.name !== undefined) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    data.name = name;
  }
  if (payload.description !== undefined) {
    data.description = typeof payload.description === "string" ? payload.description.trim() || null : null;
  }
  if (payload.active !== undefined) {
    if (typeof payload.active !== "boolean") return NextResponse.json({ error: "active must be boolean" }, { status: 400 });
    data.active = payload.active;
  }
  if (payload.trigger !== undefined) {
    const trigger = typeof payload.trigger === "string" ? payload.trigger.trim() : "";
    if (!trigger) return NextResponse.json({ error: "trigger required" }, { status: 400 });
    data.trigger = trigger;
  }
  if (payload.conditions !== undefined) {
    data.conditions =
      payload.conditions && typeof payload.conditions === "object" && !Array.isArray(payload.conditions)
        ? (payload.conditions as Prisma.InputJsonValue)
        : {};
  }
  if (payload.actions !== undefined) {
    data.actions = Array.isArray(payload.actions) ? (payload.actions as Prisma.InputJsonValue) : [];
  }

  const wf = await prisma.workflow.update({
    where: { id: existing.id },
    data,
  });
  return NextResponse.json(wf);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const existing = await prisma.workflow.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  await prisma.workflow.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
