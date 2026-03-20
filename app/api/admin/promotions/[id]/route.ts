import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const promotion = await prisma.promotion.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.discount !== undefined && { discount: body.discount || null }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.validUntil !== undefined && {
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });
  return NextResponse.json(promotion);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.promotion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
