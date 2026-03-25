export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, phone, address, role } = body;

    const STAFF_ROLES = ["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "ADMIN"] as const;
    const isRolePromotion = role && STAFF_ROLES.includes(role);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(isRolePromotion ? {
          role: role as "MANAGER" | "COURIER" | "ACCOUNTANT" | "WAREHOUSE" | "SELLER" | "ADMIN",
          staffStatus: "ACTIVE" as const,
        } : {}),
      },
      select: { id: true, name: true, phone: true, address: true, email: true, role: true },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("PATCH /api/admin/clients/[id] error:", err);
    return NextResponse.json({ error: err?.message || "Ошибка обновления" }, { status: 500 });
  }
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
