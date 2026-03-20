import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function checkAdmin(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return false;
  return true;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { approved } = await req.json();
  const review = await prisma.review.update({ where: { id: params.id }, data: { approved } });
  return NextResponse.json(review);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  await prisma.review.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
