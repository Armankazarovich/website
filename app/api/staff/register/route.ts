export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ROLE_LABELS: Record<string, string> = {
  MANAGER: "Менеджер по продажам",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Складчик",
  SELLER: "Продавец",
  CUSTOM: "Другая должность",
};

const VALID_ROLES = ["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "CUSTOM"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, password, role, customRole } = body;

    if (!name || !phone || !email || !password || !role) {
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });
    }
    if (role === "CUSTOM" && !customRole?.trim()) {
      return NextResponse.json({ error: "Укажите должность" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль слишком короткий" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "Email уже зарегистрирован" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role === "CUSTOM" ? "MANAGER" : (role as any), // CUSTOM maps to MANAGER role, identified by customRole field
        staffStatus: "PENDING",
        customRole: role === "CUSTOM" ? customRole.trim() : null,
      },
    });

    // Notify admin via Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const roleLabel = role === "CUSTOM" ? customRole.trim() : ROLE_LABELS[role];
      const text = [
        `👤 *Новая заявка от сотрудника*`,
        ``,
        `👤 *Имя:* ${user.name}`,
        `📞 *Телефон:* ${phone}`,
        `📧 *Email:* ${user.email}`,
        `💼 *Должность:* ${roleLabel}`,
        ``,
        `⏳ Ожидает подтверждения`,
        ``,
        `👉 [Открыть в админке](https://pilo-rus.ru/admin/staff)`,
      ].join("\n");

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "Markdown",
        }),
      }).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Staff register error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
