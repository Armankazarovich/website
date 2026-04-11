export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/phone";

const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const VALID_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"];

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && (role === "ADMIN" || role === "SUPER_ADMIN");
}

async function checkSuperAdmin() {
  const session = await auth();
  return session && session.user?.role === "SUPER_ADMIN";
}

// GET — list all non-USER staff
export async function GET() {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await prisma.user.findMany({
    where: { role: { not: "USER" } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      staffStatus: true,
      customRole: true,
      lastActiveAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
}

// POST — create, update_role, reset_password, set_status, delete
export async function POST(req: NextRequest) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── create ──────────────────────────────────────────────────────────────────
  if (action === "create" || !action) {
    const { name, email, password, role, phone, customRole } = body;

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
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? normalizePhone(phone) || phone.trim() : null,
        passwordHash,
        role: role as any,
        staffStatus: "ACTIVE",
        customRole: customRole?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        staffStatus: true,
        customRole: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, user });
  }

  // ── update_role ──────────────────────────────────────────────────────────────
  if (action === "update_role") {
    const { userId, role, customRole } = body;
    if (!VALID_ROLES.includes(role))
      return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any, customRole: customRole?.trim() || null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        staffStatus: true,
        customRole: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, user });
  }

  // ── set_status ───────────────────────────────────────────────────────────────
  if (action === "set_status") {
    const { userId, staffStatus } = body;
    if (!VALID_STATUSES.includes(staffStatus))
      return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { staffStatus: staffStatus as any },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        staffStatus: true,
        customRole: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, user });
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

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
