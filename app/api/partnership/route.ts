import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

async function sendPartnershipTelegram(data: {
  name: string;
  company?: string | null;
  phone: string;
  message?: string | null;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const text = [
    `🤝 *Новая заявка на сотрудничество!*`,
    ``,
    `👤 *Имя:* ${data.name}`,
    data.company ? `🏢 *Компания:* ${data.company}` : null,
    `📞 *Телефон:* ${data.phone}`,
    data.message ? `💬 *Сообщение:* ${data.message}` : null,
    ``,
    `_Ответьте по телефону как можно быстрее_`,
  ]
    .filter(Boolean)
    .join("\n");

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
  });
}

async function sendPartnershipEmail(data: {
  name: string;
  company?: string | null;
  phone: string;
  message?: string | null;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || "mail.beget.com",
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: SMTP_PORT === 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: `"ПилоРус" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `🤝 Заявка на сотрудничество — ${data.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="background:#5C3317;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;">🤝 Новая заявка на сотрудничество</h1>
        </div>
        <div style="padding:28px 32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#888;width:120px;">Имя</td><td style="padding:8px 0;font-weight:600;">${data.name}</td></tr>
            ${data.company ? `<tr><td style="padding:8px 0;color:#888;">Компания</td><td style="padding:8px 0;font-weight:600;">${data.company}</td></tr>` : ""}
            <tr><td style="padding:8px 0;color:#888;">Телефон</td><td style="padding:8px 0;font-weight:600;"><a href="tel:${data.phone}" style="color:#E8700A;">${data.phone}</a></td></tr>
            ${data.message ? `<tr><td style="padding:8px 0;color:#888;vertical-align:top;">Сообщение</td><td style="padding:8px 0;">${data.message}</td></tr>` : ""}
          </table>
        </div>
        <div style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#aaa;font-size:12px;">ПилоРус · pilo-rus.ru · 8-985-970-71-33</p>
        </div>
      </div>
    `,
  });
}

export async function POST(req: Request) {
  try {
    const { name, company, phone, message } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ error: "Имя и телефон обязательны" }, { status: 400 });
    }

    await prisma.partnershipLead.create({
      data: { name, company: company || null, phone, message: message || null },
    });

    // Уведомления — не блокируем ответ
    sendPartnershipTelegram({ name, company, phone, message }).catch(console.error);
    sendPartnershipEmail({ name, company, phone, message }).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Partnership API error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
