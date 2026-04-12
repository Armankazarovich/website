export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && ["ADMIN", "MANAGER"].includes(role);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const wf = await prisma.workflow.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.trigger !== undefined && { trigger: body.trigger }),
      ...(body.conditions !== undefined && { conditions: body.conditions }),
      ...(body.actions !== undefined && { actions: body.actions }),
    },
  });
  return NextResponse.json(wf);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.workflow.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
