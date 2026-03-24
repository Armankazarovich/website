export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const VALID_ROLES = ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, email, password, role, customRole } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return NextResponse.json({ error: "Email уже используется" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email.toLowerCase().trim(),
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
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
