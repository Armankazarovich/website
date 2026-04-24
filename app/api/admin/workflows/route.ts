export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role as string);
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, description, trigger, conditions, actions } = await req.json();
  if (!name?.trim() || !trigger) return NextResponse.json({ error: "name and trigger required" }, { status: 400 });
  const wf = await prisma.workflow.create({
    data: { name: name.trim(), description: description?.trim() || null, trigger, conditions: conditions ?? {}, actions: actions ?? [] },
  });
  return NextResponse.json(wf);
}
