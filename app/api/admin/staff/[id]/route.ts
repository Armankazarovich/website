export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { getCurrentTenantId } from "@/lib/tenant-context";

const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const VALID_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"];

function isAdministratorRole(role: string | null | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const sessionRole = session?.user?.role;
  if (sessionRole !== "SUPER_ADMIN" && sessionRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const tenantId = getCurrentTenantId();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { staffStatus, role, name, phone, email } = body;

  if (staffStatus && (typeof staffStatus !== "string" || !VALID_STATUSES.includes(staffStatus))) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (role && (typeof role !== "string" || !VALID_ROLES.includes(role))) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSuperAdmin = sessionRole === "SUPER_ADMIN";
  if (!isSuperAdmin && role === "ADMIN") {
    return NextResponse.json({ error: "Only SUPER_ADMIN can assign ADMIN" }, { status: 403 });
  }
  if (!isSuperAdmin && role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only SUPER_ADMIN can assign SUPER_ADMIN" }, { status: 403 });
  }
  if (!isSuperAdmin && isAdministratorRole(target.role)) {
    return NextResponse.json({ error: "Only SUPER_ADMIN can update administrators" }, { status: 403 });
  }

  const data: any = {};
  if (staffStatus) data.staffStatus = staffStatus;
  if (role) data.role = role;
  if (name !== undefined) data.name = typeof name === "string" ? name.trim() || null : null;
  if (phone !== undefined) data.phone = typeof phone === "string" && phone.trim() ? (normalizePhone(phone) || phone.trim()) : null;
  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id: target.id },
      },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    data.email = normalizedEmail;
  }

  const user = await prisma.user.update({
    where: { id: target.id },
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
  const sessionRole = session?.user?.role;
  if (sessionRole !== "SUPER_ADMIN" && sessionRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const tenantId = getCurrentTenantId();

  // Запретить удалять самого себя
  if (session?.user?.id === params.id) {
    return NextResponse.json({ error: "Нельзя удалить свой аккаунт" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sessionRole !== "SUPER_ADMIN" && isAdministratorRole(target.role)) {
    return NextResponse.json({ error: "Only SUPER_ADMIN can delete administrators" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: target.id } });
  return NextResponse.json({ success: true });
}
