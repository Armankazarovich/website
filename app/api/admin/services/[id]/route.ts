import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const body = await req.json();
  const service = await prisma.service.update({ where: { id: params.id }, data: body });
  return NextResponse.json(service);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  await prisma.service.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
