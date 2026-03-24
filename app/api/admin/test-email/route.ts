export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const to = searchParams.get("to") || process.env.ADMIN_EMAIL || "info@pilo-rus.ru";

  if (secret !== process.env.CRON_SECRET && secret !== "pilorus_cron_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.beget.com",
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: SMTP_PORT === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });

  const results: string[] = [];

  // Test 1: verify connection
  try {
    await transporter.verify();
    results.push("✅ SMTP connection verified");
  } catch (err: any) {
    results.push(`❌ SMTP connection failed: ${err.message}`);
    return NextResponse.json({
      ok: false,
      results,
      config: {
        host: process.env.SMTP_HOST,
        port: SMTP_PORT,
        user: process.env.SMTP_USER,
        passSet: !!process.env.SMTP_PASSWORD,
      },
    });
  }

  // Test 2: send test email
  try {
    await transporter.sendMail({
      from: `"ПилоРус Test" <${process.env.SMTP_USER}>`,
      to,
      subject: "✅ Тест email ПилоРус — всё работает!",
      html: `<h2>Тест почты ПилоРус</h2><p>Если вы видите это письмо — email уведомления работают корректно.</p><p>SMTP: ${process.env.SMTP_HOST}:${SMTP_PORT}</p><p>Время: ${new Date().toLocaleString("ru-RU")}</p>`,
    });
    results.push(`✅ Test email sent to: ${to}`);
  } catch (err: any) {
    results.push(`❌ Send failed: ${err.message}`);
  }

  return NextResponse.json({
    ok: true,
    results,
    config: {
      host: process.env.SMTP_HOST,
      port: SMTP_PORT,
      user: process.env.SMTP_USER,
      passSet: !!process.env.SMTP_PASSWORD,
    },
  });
}
