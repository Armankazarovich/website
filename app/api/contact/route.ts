export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      phone,
      contact,
      message,
      source,
      serviceTitle,
      serviceSlug,
      productTitle,
      productSlug,
      productSku,
      preferredDate,
      preferredTime,
      legalConsent,
    } = await req.json();

    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanContact = typeof contact === "string" ? contact.trim() : "";
    const cleanMessage = typeof message === "string" ? message.trim() : "";
    const contactValue = cleanPhone || cleanContact;
    const contactDigits = contactValue.replace(/\D/g, "");
    const contactEmail = contactValue.includes("@") ? contactValue : null;
    const leadPhone = cleanPhone || (contactDigits.length >= 6 ? contactValue : null);

    if (!leadPhone && !contactEmail && !cleanMessage) {
      return NextResponse.json({ error: "Укажите телефон, email или вопрос" }, { status: 400 });
    }

    if (legalConsent !== true) {
      return NextResponse.json(
        { error: "Подтвердите согласие на обработку персональных данных" },
        { status: 400 },
      );
    }

    const sourceLabel =
      source === "SERVICE"
        ? "услуга на сайте"
        : source === "PRODUCT"
          ? "товарная страница"
          : "форма на странице Контакты";
    const serviceLine = serviceTitle ? `Услуга: ${serviceTitle}` : null;
    const productLine = productTitle
      ? `Товар: ${productTitle}${productSku ? ` (${productSku})` : ""}`
      : null;
    const productLink = productSlug ? `Ссылка: /product/${productSlug}` : null;
    const contactLine = cleanContact && !cleanPhone ? `Контакт: ${cleanContact}` : null;
    const timeLine =
      preferredDate || preferredTime
        ? `Желаемое время: ${[preferredDate, preferredTime].filter(Boolean).join(" ")}`
        : null;
    const crmComment = [productLine, productLink, serviceLine, timeLine, contactLine, cleanMessage].filter(Boolean).join("\n");

    // Telegram уведомление
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const text = [
        `📩 *Новая заявка с сайта!*`,
        ``,
        name ? `👤 *Имя:* ${name}` : null,
        leadPhone ? `📞 *Телефон:* ${leadPhone}` : null,
        contactEmail ? `✉️ *Email:* ${contactEmail}` : null,
        productTitle ? `🧱 *Товар:* ${productTitle}` : null,
        productSku ? `🏷 *Артикул:* ${productSku}` : null,
        serviceTitle ? `🧩 *Услуга:* ${serviceTitle}` : null,
        timeLine ? `🗓 *Время:* ${timeLine.replace("Желаемое время: ", "")}` : null,
        cleanMessage ? `💬 *Вопрос:* ${cleanMessage}` : null,
        ``,
        `_Источник: ${sourceLabel}_`,
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
          subject: `📩 Заявка с сайта — ${leadPhone || contactEmail || productTitle || "контакт"}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
              <div style="background:#5C3317;padding:20px 28px;border-radius:12px 12px 0 0;">
                <h2 style="margin:0;color:#fff;font-size:18px;">📩 Новая заявка с сайта</h2>
              </div>
              <div style="background:#fff;padding:24px 28px;border:1px solid #eee;border-radius:0 0 12px 12px;">
                ${name ? `<p><strong>Имя:</strong> ${name}</p>` : ""}
                ${leadPhone ? `<p><strong>Телефон:</strong> <a href="tel:${leadPhone}" style="color:var(--primary);">${leadPhone}</a></p>` : ""}
                ${contactEmail ? `<p><strong>Email:</strong> <a href="mailto:${contactEmail}" style="color:var(--primary);">${contactEmail}</a></p>` : ""}
                ${productTitle ? `<p><strong>Товар:</strong> ${productTitle}</p>` : ""}
                ${productSku ? `<p><strong>Артикул:</strong> ${productSku}</p>` : ""}
                ${serviceTitle ? `<p><strong>Услуга:</strong> ${serviceTitle}</p>` : ""}
                ${timeLine ? `<p><strong>Желаемое время:</strong> ${timeLine.replace("Желаемое время: ", "")}</p>` : ""}
                ${cleanMessage ? `<p><strong>Вопрос:</strong> ${cleanMessage}</p>` : ""}
                <p style="color:var(--muted-foreground);font-size:12px;margin-top:16px;">Источник: ${sourceLabel} · pilo-rus.ru</p>
              </div>
            </div>
          `,
        })
        .catch(console.error);
    }

    // 🎯 Авто-создание лида в CRM при заявке с формы контактов
    prisma.lead.create({
      data: {
        name: name || leadPhone || contactEmail || "Посетитель сайта",
        phone: leadPhone,
        email: contactEmail,
        source: "WEBSITE",
        stage: "NEW",
        comment: crmComment || null,
        tags: source === "SERVICE"
          ? ["Услуга", serviceTitle || serviceSlug || "Заявка"].filter(Boolean)
          : source === "PRODUCT"
            ? ["Товар", productTitle || productSlug || "Заявка", productSku].filter(Boolean)
            : ["Контакт"],
      },
    }).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
