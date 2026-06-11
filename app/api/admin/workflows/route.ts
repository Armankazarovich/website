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

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const workflows = await prisma.workflow.findMany({
    where: { tenantId },
    include: { _count: { select: { logs: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid workflow payload" }, { status: 400 });
  }

  const { name, description, trigger, conditions, actions } = body as Record<string, unknown>;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanTrigger = typeof trigger === "string" ? trigger.trim() : "";
  if (!cleanName || !cleanTrigger) return NextResponse.json({ error: "name and trigger required" }, { status: 400 });
  const cleanConditions =
    conditions && typeof conditions === "object" && !Array.isArray(conditions)
      ? (conditions as Prisma.InputJsonValue)
      : {};
  const cleanActions = Array.isArray(actions) ? (actions as Prisma.InputJsonValue) : [];

  const wf = await prisma.workflow.create({
    data: {
      tenantId,
      name: cleanName,
      description: typeof description === "string" ? description.trim() || null : null,
      trigger: cleanTrigger,
      conditions: cleanConditions,
      actions: cleanActions,
      active: false,
    },
  });
  return NextResponse.json(wf);
}
