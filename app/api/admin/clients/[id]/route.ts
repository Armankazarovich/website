export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant-context";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const sessionRole = session?.user?.role;
  const canEditClient = sessionRole === "SUPER_ADMIN" || sessionRole === "ADMIN" || sessionRole === "MANAGER";
  const canPromoteClient = sessionRole === "SUPER_ADMIN" || sessionRole === "ADMIN";
  if (!canEditClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const tenantId = getCurrentTenantId();

  try {
    const body = await req.json();
    const { name, phone, address, role: requestedRole } = body;

    // ADMIN и SUPER_ADMIN нельзя назначить через этот endpoint — только через staff
    const PROMOTABLE_ROLES = ["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"] as const;
    const isRolePromotion = requestedRole && (PROMOTABLE_ROLES as readonly string[]).includes(requestedRole);

    if (requestedRole !== undefined && !isRolePromotion) {
      return NextResponse.json({ error: "Invalid client role" }, { status: 400 });
    }

    if (isRolePromotion && !canPromoteClient) {
      return NextResponse.json({ error: "Нет прав на назначение сотрудников" }, { status: 403 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { id: params.id, tenantId, role: "USER" },
      select: { id: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...(name !== undefined ? { name: name || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(isRolePromotion ? {
          role: requestedRole as "MANAGER" | "COURIER" | "ACCOUNTANT" | "WAREHOUSE" | "SELLER",
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
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const tenantId = getCurrentTenantId();

  // Prevent deleting admin/staff accounts through this endpoint
  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "USER") {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: user.id } });
  return NextResponse.json({ success: true });
}
