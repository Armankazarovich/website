export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

// 5 заявок в час на IP
const promoLimiter = rateLimit("promo-request", 5, 60 * 60 * 1000);

// Промо-типы (какая акция → какие теги + лейбл)
const PROMO_LABELS: Record<string, { label: string; tags: string[] }> = {
  "volume-discount": { label: "Скидка за объём", tags: ["Акция", "Объём"] },
  "free-delivery":   { label: "Бесплатная доставка",  tags: ["Акция", "Доставка"] },
};

function sanitize(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>]/g, "")   // strip HTML tags
    .replace(/\s+/g, " ")   // collapse whitespace
    .trim()
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 заявок в час с одного IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
    if (!promoLimiter.check(ip)) {
      return NextResponse.json(
        { error: "Слишком много заявок. Попробуйте позже или позвоните нам." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = sanitize(body.name, 100);
    const phoneRaw = sanitize(body.phone, 30);
    const volume = sanitize(body.volume, 200);
    const message = sanitize(body.message, 1000);
    const promoType = sanitize(body.promoType, 50);

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
    }
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      return NextResponse.json({ error: "Некорректный телефон" }, { status: 400 });
    }

    const promo = PROMO_LABELS[promoType] ?? { label: "Акция", tags: ["Акция"] };

    // Формируем комментарий: объём + доп. сообщение
    const commentParts: string[] = [];
    commentParts.push(`Акция: ${promo.label}`);
    if (volume) commentParts.push(`Объём/запрос: ${volume}`);
    if (message) commentParts.push(`Комментарий: ${message}`);
    const fullComment = commentParts.join("\n");

    // Создаём Lead → попадает в /admin/crm канбан (колонка "Новый лид")
    await prisma.lead.create({
      data: {
        name,
        phone,
        source: "WEBSITE",
        stage: "NEW",
        comment: fullComment,
        tags: promo.tags,
      },
    });

    // Telegram уведомление
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const text = [
        `🎯 *Заявка по акции: ${promo.label}*`,
        ``,
        `*Имя:* ${name}`,
        `*Телефон:* ${phone}`,
        volume ? `*Объём/запрос:* ${volume}` : null,
        message ? `*Комментарий:* ${message}` : null,
        ``,
        `_Источник: главная → промо-карточка_`,
      ]
        .filter(Boolean)
        .join("\n");

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
      }).catch(console.error);
    }

    // Email админу
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
          subject: `🎯 Заявка по акции «${promo.label}» — ${phone}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
              <div style="background:#5C3317;padding:20px 28px;border-radius:12px 12px 0 0;">
                <h2 style="margin:0;color:#fff;font-size:18px;">🎯 Заявка по акции</h2>
                <p style="margin:6px 0 0;color:#F5C98A;font-size:14px;">${promo.label}</p>
              </div>
              <div style="background:#fff;padding:24px 28px;border:1px solid #eee;border-radius:0 0 12px 12px;">
                <p><strong>Имя:</strong> ${name}</p>
                <p><strong>Телефон:</strong> <a href="tel:${phone}" style="color:#E8700A;">${phone}</a></p>
                ${volume ? `<p><strong>Объём/запрос:</strong> ${volume}</p>` : ""}
                ${message ? `<p><strong>Комментарий:</strong> ${message}</p>` : ""}
                <p style="color:#999;font-size:12px;margin-top:16px;">
                  Источник: главная pilo-rus.ru → промо-карточка<br/>
                  Лид создан в CRM: /admin/crm
                </p>
              </div>
            </div>
          `,
        })
        .catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Promo request API error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
