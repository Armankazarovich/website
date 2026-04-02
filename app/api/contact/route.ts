export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

export async function POST(req: NextRequest) {
  try {
    const { name, phone, message } = await req.json();

    if (!phone || phone.length < 6) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    // Telegram уведомление
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const text = [
        `📩 *Новая заявка с сайта!*`,
        ``,
        name ? `👤 *Имя:* ${name}` : null,
        `📞 *Телефон:* ${phone}`,
        message ? `💬 *Вопрос:* ${message}` : null,
        ``,
        `_Источник: форма на странице Контакты_`,
      ]
        .filter(Boolean)
        .join("\n");

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
      }).catch(console.error);
    }

    // Email уведомление администратору
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.beget.com",
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        requireTLS: SMTP_PORT === 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        tls: { rejectUnauthorized: false },
      });

      transporter
        .sendMail({
          from: `"ПилоРус" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `📩 Заявка с сайта — ${phone}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
              <div style="background:#5C3317;padding:20px 28px;border-radius:12px 12px 0 0;">
                <h2 style="margin:0;color:#fff;font-size:18px;">📩 Новая заявка с сайта</h2>
              </div>
              <div style="background:#fff;padding:24px 28px;border:1px solid #eee;border-radius:0 0 12px 12px;">
                ${name ? `<p><strong>Имя:</strong> ${name}</p>` : ""}
                <p><strong>Телефон:</strong> <a href="tel:${phone}" style="color:#E8700A;">${phone}</a></p>
                ${message ? `<p><strong>Вопрос:</strong> ${message}</p>` : ""}
                <p style="color:#999;font-size:12px;margin-top:16px;">Источник: страница Контакты · pilo-rus.ru</p>
              </div>
            </div>
          `,
        })
        .catch(console.error);
    }

    // 🎯 Авто-создание лида в CRM при заявке с формы контактов
    prisma.lead.create({
      data: {
        name: name || phone,
        phone,
        source: "WEBSITE",
        stage: "NEW",
        comment: message || null,
        tags: ["Контакт"],
      },
    }).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
