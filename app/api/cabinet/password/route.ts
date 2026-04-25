export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit("cabinet-password", 5, 15 * 60_000);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!limiter.check(session.user.id)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через 15 минут." },
      { status: 429 }
    );
  }

  const { currentPassword, newPassword } = await req.json();

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ error: "Пароль должен содержать минимум 6 символов" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: hash } });

  return NextResponse.json({ ok: true });
}
