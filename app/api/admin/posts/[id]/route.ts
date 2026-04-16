import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const body = await req.json();
  const post = await prisma.post.update({ where: { id: params.id }, data: body });
  return NextResponse.json(post);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
