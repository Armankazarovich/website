export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit("reset-password", 5, 15 * 60 * 1000); // 5 per 15 min

function generatePassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Rate limit by admin user ID
  if (!limiter.check(session.user.id || "unknown")) {
    return NextResponse.json({ error: "Слишком много запросов. Подождите 15 минут." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id, role: "USER" },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  const newPassword = generatePassword(10);
  const hash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash: hash },
  });

  // Отправить email клиенту с новым паролем
  let emailSent = false;
  try {
    const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.beget.com",
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"ПилоРус" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Ваш пароль был сброшен — ПилоРус",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#8B4513;margin-bottom:8px">Сброс пароля</h2>
          <p>Здравствуйте, <strong>${user.name || "клиент"}</strong>!</p>
          <p>Администратор сбросил ваш пароль. Новый временный пароль:</p>
          <div style="background:#f5f5f5;border:1px solid #ddd;border-radius:8px;padding:16px 24px;margin:16px 0;text-align:center">
            <span style="font-size:24px;font-weight:bold;letter-spacing:3px;color:#333">${newPassword}</span>
          </div>
          <p>Войдите на сайт и смените пароль в личном кабинете.</p>
          <a href="https://pilo-rus.ru/login" style="display:inline-block;background:#8B4513;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px">
            Войти на сайт →
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">ПилоРус — лесоматериалы и строительные материалы</p>
        </div>
      `,
    });
    emailSent = true;
  } catch (e) {
    console.error("Password reset email error:", e);
  }

  return NextResponse.json({
    success: true,
    emailSent,
    email: user.email,
    // Пароль показываем в UI только если email НЕ отправлен (чтобы админ мог передать вручную)
    ...(emailSent ? {} : { newPassword }),
    message: emailSent
      ? `Новый пароль отправлен на ${user.email}`
      : "Email не отправлен — передайте пароль клиенту вручную",
  });
}
