export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";
import {
  ARAY_PARTNER_LEAD_TAGS,
  buildArayPartnerActivityText,
} from "@/lib/aray-crm-automation";
import { getCurrentTenantId } from "@/lib/tenant-context";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clean(value: unknown, maxLength = 300): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const safe = {
    name: escapeHtml(data.name),
    company: data.company ? escapeHtml(data.company) : "",
    phone: escapeHtml(data.phone),
    message: data.message ? escapeHtml(data.message) : "",
  };
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || "smtp.beget.com",
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
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;">
        <div style="padding:24px 32px;">
          <h1 style="margin:0;font-size:20px;">🤝 Новая заявка на сотрудничество</h1>
        </div>
        <div style="padding:28px 32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;width:120px;">Имя</td><td style="padding:8px 0;font-weight:600;">${safe.name}</td></tr>
            ${safe.company ? `<tr><td style="padding:8px 0;">Компания</td><td style="padding:8px 0;font-weight:600;">${safe.company}</td></tr>` : ""}
            <tr><td style="padding:8px 0;">Телефон</td><td style="padding:8px 0;font-weight:600;"><a href="tel:${safe.phone}">${safe.phone}</a></td></tr>
            ${safe.message ? `<tr><td style="padding:8px 0;vertical-align:top;">Сообщение</td><td style="padding:8px 0;">${safe.message}</td></tr>` : ""}
          </table>
        </div>
        <div style="padding:16px 32px;border-top:1px solid currentColor;">
          <p style="margin:0;font-size:12px;">ПилоРус · pilo-rus.ru · ${DEFAULT_SETTINGS.phone}</p>
        </div>
      </div>
    `,
  });
}

export async function POST(req: Request) {
  try {
    const body = asRecord(await req.json().catch(() => null));
    const tenantId = getCurrentTenantId();
    const name = clean(body.name, 120);
    const company = clean(body.company, 160);
    const phone = clean(body.phone, 80);
    const message = clean(body.message, 1200);
    const sourceTitle = clean(body.sourceTitle, 160);
    const leadComment = [sourceTitle || null, message || null].filter(Boolean).join("\n\n");

    if (name.length < 2 || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Имя и телефон обязательны" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.partnershipLead.create({
        data: { tenantId, name, company: company || null, phone, message: leadComment || null },
      }),
      prisma.lead.create({
        data: {
          tenantId,
          name,
          company: company || null,
          phone,
          source: "PARTNER",
          stage: "NEW",
          comment: leadComment || null,
          tags: ARAY_PARTNER_LEAD_TAGS,
          activities: {
            create: {
              type: "SYSTEM",
              text: buildArayPartnerActivityText(),
            },
          },
        },
      }),
    ]);

    // Уведомления — не блокируем ответ
    sendPartnershipTelegram({ name, company, phone, message: leadComment || message }).catch(console.error);
    sendPartnershipEmail({ name, company, phone, message: leadComment || message }).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Partnership API error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
