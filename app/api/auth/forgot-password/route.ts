export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Проверяем существует ли пользователь — но НЕ говорим об этом (защита от перебора)
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      // Удаляем старые токены этого пользователя
      await prisma.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      });

      // Генерируем новый токен
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

      await prisma.passwordResetToken.create({
        data: { email: normalizedEmail, token, expiresAt },
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(normalizedEmail, resetUrl);
        console.log(`✅ Письмо сброса пароля отправлено на ${normalizedEmail}`);
      } catch (emailErr) {
        // SMTP ошибка — логируем но не раскрываем пользователю
        console.error(`❌ Ошибка отправки письма на ${normalizedEmail}:`, emailErr);
        console.log(`🔗 Ссылка для сброса (использовать вручную): ${resetUrl}`);
      }
    }

    // Всегда возвращаем одинаковый ответ (не раскрываем существует ли email)
    return NextResponse.json({
      ok: true,
      message: "Если этот email зарегистрирован, вы получите письмо с инструкциями",
    });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
