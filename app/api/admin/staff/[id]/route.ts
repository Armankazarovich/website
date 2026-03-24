export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_ROLES = ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const VALID_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { staffStatus, role, name, phone, email } = body;

  if (staffStatus && !VALID_STATUSES.includes(staffStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const data: any = {};
  if (staffStatus) data.staffStatus = staffStatus;
  if (role) data.role = role;
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      staffStatus: true,
      customRole: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Запретить удалять самого себя
  if ((session?.user as any)?.id === params.id) {
    return NextResponse.json({ error: "Нельзя удалить свой аккаунт" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
