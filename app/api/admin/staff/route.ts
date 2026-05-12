export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/phone";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { canUserBusinessRoleAccessAction } from "@/lib/business-role-access";

const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const VALID_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"];

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session) return false;
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  return canUserBusinessRoleAccessAction(session.user?.id as string | undefined, "roles.manage");
}

async function checkSuperAdmin() {
  const session = await auth();
  return session && session.user?.role === "SUPER_ADMIN";
}

async function protectedStaffResponse(userId: string) {
  if (await checkSuperAdmin()) return null;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (target?.role === "SUPER_ADMIN" || target?.role === "ADMIN") {
    return NextResponse.json({ error: "Только SUPER_ADMIN может менять администратора" }, { status: 403 });
  }
  return null;
}

const staffSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  staffStatus: true,
  customRole: true,
  lastActiveAt: true,
  createdAt: true,
  businessRoleMembers: {
    select: {
      id: true,
      businessRoleId: true,
      isPrimary: true,
      role: {
        select: {
          id: true,
          roleKey: true,
          label: true,
          baseRole: true,
          scope: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
  },
};

function serializeStaffUser(user: any) {
  const businessRoles = (user.businessRoleMembers ?? [])
    .filter((membership: any) => membership.role?.isActive)
    .map((membership: any) => ({
      membershipId: membership.id,
      id: membership.role.id,
      roleKey: membership.role.roleKey,
      label: membership.role.label,
      baseRole: membership.role.baseRole,
      scope: membership.role.scope,
      isPrimary: Boolean(membership.isPrimary),
    }));
  const primary = businessRoles.find((role: any) => role.isPrimary) ?? businessRoles[0] ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    staffStatus: user.staffStatus,
    customRole: user.customRole,
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
    primaryBusinessRoleId: primary?.id ?? null,
    businessRoles,
  };
}

async function resolveStaffBusinessRole(tenantId: string, businessRoleId: unknown) {
  if (typeof businessRoleId !== "string" || !businessRoleId.trim()) return null;
  const role = await prisma.businessRole.findFirst({
    where: {
      id: businessRoleId,
      tenantId,
      isActive: true,
    },
  });
  if (!role) throw new Error("BUSINESS_ROLE_NOT_FOUND");
  if (!role.baseRole || role.baseRole === "USER") throw new Error("BUSINESS_ROLE_NOT_STAFF");
  return role;
}

async function setPrimaryBusinessRole(userId: string, tenantId: string, businessRole: Awaited<ReturnType<typeof resolveStaffBusinessRole>>) {
  await prisma.businessRoleMember.updateMany({
    where: { tenantId, userId, isPrimary: true },
    data: { isPrimary: false },
  });

  if (!businessRole) return;

  await prisma.businessRoleMember.upsert({
    where: {
      businessRoleId_userId: {
        businessRoleId: businessRole.id,
        userId,
      },
    },
    create: {
      tenantId,
      businessRoleId: businessRole.id,
      userId,
      status: "ACTIVE",
      isPrimary: true,
      metadata: { source: "staff-primary-role" },
    },
    update: {
      status: "ACTIVE",
      isPrimary: true,
      metadata: { source: "staff-primary-role", updatedAt: new Date().toISOString() },
    },
  });
}

function businessRoleError(error: unknown) {
  if (error instanceof Error && error.message === "BUSINESS_ROLE_NOT_FOUND") {
    return NextResponse.json({ error: "Умная роль не найдена" }, { status: 404 });
  }
  if (error instanceof Error && error.message === "BUSINESS_ROLE_NOT_STAFF") {
    return NextResponse.json({ error: "Эта умная роль не подходит для сотрудника" }, { status: 400 });
  }
  throw error;
}

// GET — list all non-USER staff (supports ?status=PENDING&limit=5)
export async function GET(req: NextRequest) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const limitParam = url.searchParams.get("limit");

  const where: any = { role: { not: "USER" } };
  if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
    where.staffStatus = statusFilter;
  }

  const staff = await prisma.user.findMany({
    where,
    select: staffSelect,
    orderBy: { createdAt: "desc" },
    ...(limitParam ? { take: Math.min(parseInt(limitParam) || 50, 100) } : {}),
  });

  return NextResponse.json(staff.map(serializeStaffUser));
}

// POST — create, update_role, reset_password, set_status, delete
export async function POST(req: NextRequest) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── create ──────────────────────────────────────────────────────────────────
  if (action === "create" || !action) {
    const { name, email, password, phone, customRole, businessRoleId } = body;
    const tenantId = getCurrentTenantId();
    let businessRole = null;
    try {
      businessRole = await resolveStaffBusinessRole(tenantId, businessRoleId);
    } catch (error) {
      return businessRoleError(error);
    }
    const role = businessRole?.baseRole ?? body.role;

    if (!name || !email || !password || !role)
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });

    if (!VALID_ROLES.includes(role))
      return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });

    // Only SUPER_ADMIN can create other SUPER_ADMIN accounts
    if (role === "SUPER_ADMIN" && !(await checkSuperAdmin()))
      return NextResponse.json({ error: "Только Супер Администратор может создавать другие SUPER_ADMIN аккаунты" }, { status: 403 });

    if (password.length < 6)
      return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });

    const exists = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (exists)
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? normalizePhone(phone) || phone.trim() : null,
        passwordHash,
        role: role as any,
        staffStatus: "ACTIVE",
        customRole: customRole?.trim() || businessRole?.label || null,
      },
      select: staffSelect,
    });
    await setPrimaryBusinessRole(user.id, tenantId, businessRole);
    const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: staffSelect });
    return NextResponse.json({ ok: true, user: serializeStaffUser(freshUser) });
  }

  // ── update_role ──────────────────────────────────────────────────────────────
  if (action === "update_role") {
    const { userId, customRole, businessRoleId } = body;
    const tenantId = getCurrentTenantId();
    let businessRole = null;
    try {
      businessRole = await resolveStaffBusinessRole(tenantId, businessRoleId);
    } catch (error) {
      return businessRoleError(error);
    }
    const role = businessRole?.baseRole ?? body.role;
    if (!VALID_ROLES.includes(role))
      return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });

    if (role === "SUPER_ADMIN" && !(await checkSuperAdmin()))
      return NextResponse.json({ error: "Только SUPER_ADMIN может назначать SUPER_ADMIN" }, { status: 403 });

    const protectedResponse = await protectedStaffResponse(userId);
    if (protectedResponse) return protectedResponse;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any, customRole: customRole?.trim() || businessRole?.label || null },
      select: staffSelect,
    });
    await setPrimaryBusinessRole(user.id, tenantId, businessRole);
    const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: staffSelect });
    return NextResponse.json({ ok: true, user: serializeStaffUser(freshUser) });
  }

  // ── set_status ───────────────────────────────────────────────────────────────
  if (action === "set_status") {
    const { userId, staffStatus } = body;
    if (!VALID_STATUSES.includes(staffStatus))
      return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });

    const protectedResponse = await protectedStaffResponse(userId);
    if (protectedResponse) return protectedResponse;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { staffStatus: staffStatus as any },
      select: staffSelect,
    });
    return NextResponse.json({ ok: true, user: serializeStaffUser(user) });
  }

  // ── reset_password ───────────────────────────────────────────────────────────
  if (action === "reset_password") {
    const { userId, password } = body;
    if (!password || password.length < 6)
      return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  }

  // ── delete ───────────────────────────────────────────────────────────────────
  if (action === "delete") {
    const { userId } = body;
    const session = await auth();
    if (session?.user?.id === userId)
      return NextResponse.json({ error: "Нельзя удалить свой аккаунт" }, { status: 400 });

    const protectedResponse = await protectedStaffResponse(userId);
    if (protectedResponse) return protectedResponse;

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
