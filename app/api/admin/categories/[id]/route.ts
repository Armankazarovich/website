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
  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.image !== undefined && { image: body.image }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(category);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
