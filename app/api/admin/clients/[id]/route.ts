export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, address } = body;

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name || null;
  if (phone !== undefined) updateData.phone = phone || null;
  if (address !== undefined) updateData.address = address || null;

  const user = await prisma.user.update({
    where: { id: params.id, role: "USER" },
    data: updateData,
    select: { id: true, name: true, phone: true, address: true, email: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Prevent deleting admin/staff accounts through this endpoint
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { role: true },
  });

  if (!user || user.role !== "USER") {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
