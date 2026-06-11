export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";
import bcrypt from "bcryptjs";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { upsertSiteSetting } from "@/lib/tenant-settings";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && (role === "ADMIN" || role === "SUPER_ADMIN");
}

async function getSmtpConfig() {
  const keys = [
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_pass",
    "smtp_from",
    "smtp_from_name",
  ];
  const tenantId = getCurrentTenantId();
  const rows = await prisma.siteSettings.findMany({
    where: { tenantId, key: { in: keys } },
  });
  const cfg: Record<string, string> = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeEmailHtml(value: unknown) {
  return cleanText(value, 100_000)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function requireConfirmation(body: Record<string, unknown>) {
  return body.confirm === true;
}

async function getTenantAudienceEmails(tenantId: string) {
  const [users, orders, newsletter] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: { email: true },
    }),
    prisma.order.findMany({
      where: { tenantId, deletedAt: null },
      select: { guestEmail: true },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { tenantId, active: true },
      select: { email: true },
    }),
  ]);

  return new Set(
    [
      ...users.map((user) => normalizeEmail(user.email)),
      ...orders.map((order) => normalizeEmail(order.guestEmail)),
      ...newsletter.map((item) => normalizeEmail(item.email)),
    ].filter(Boolean) as string[],
  );
}

export async function GET(req: Request) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "smtp_settings") {
    const cfg = await getSmtpConfig();
    // Don't expose password
    return NextResponse.json({ ...cfg, smtp_pass: cfg.smtp_pass ? "***" : "" });
  }

  // Get email subscribers (users with email + orders + imported newsletter base)
  const tenantId = getCurrentTenantId();
  const [users, orders, newsletter] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { tenantId, deletedAt: null },
      select: { guestEmail: true, guestName: true, createdAt: true },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { tenantId, active: true },
      select: { email: true, name: true, source: true, createdAt: true },
    }),
  ]);

  // Build unique email list
  const emailMap = new Map<
    string,
    { name: string; source: string; date: Date }
  >();
  for (const u of users) {
    const email = normalizeEmail(u.email);
    if (email)
      emailMap.set(email, {
        name: u.name || "",
        source: "registered",
        date: u.createdAt,
      });
  }
  for (const o of orders) {
    const email = normalizeEmail(o.guestEmail);
    if (email && !emailMap.has(email)) {
      emailMap.set(email, {
        name: o.guestName || "",
        source: "order",
        date: o.createdAt,
      });
    }
  }
  for (const n of newsletter) {
    const email = normalizeEmail(n.email);
    if (email && !emailMap.has(email)) {
      emailMap.set(email, {
        name: n.name || "",
        source: n.source || "newsletter",
        date: n.createdAt,
      });
    }
  }

  const subscribers = Array.from(emailMap.entries())
    .map(([email, info]) => ({
      email,
      ...info,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return NextResponse.json({ subscribers, total: subscribers.length });
}

export async function POST(req: Request) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const body = asRecord(parsed);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { action } = body;
  const tenantId = getCurrentTenantId();

  if (action === "save_smtp") {
    if (!requireConfirmation(body)) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      smtp_from,
      smtp_from_name,
    } = body;
    const port = Number(smtp_port || "587");
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json({ error: "Некорректный SMTP порт" }, { status: 400 });
    }
    const fromEmail = smtp_from ? normalizeEmail(smtp_from) : "";
    if (smtp_from && !fromEmail) {
      return NextResponse.json({ error: "Некорректный email отправителя" }, { status: 400 });
    }
    const settings = [
      { key: "smtp_host", value: cleanText(smtp_host, 200) },
      { key: "smtp_port", value: String(port) },
      { key: "smtp_user", value: cleanText(smtp_user, 200) },
      { key: "smtp_from", value: fromEmail || "" },
      { key: "smtp_from_name", value: cleanText(smtp_from_name, 120) },
    ];
    if (typeof smtp_pass === "string" && smtp_pass && smtp_pass !== "***") {
      settings.push({ key: "smtp_pass", value: smtp_pass.slice(0, 500) });
    }
    await Promise.all(
      settings.map(({ key, value }) =>
        upsertSiteSetting(key, value),
      ),
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "test_smtp") {
    const cfg = await getSmtpConfig();
    if (!cfg.smtp_host || !cfg.smtp_user)
      return NextResponse.json({ error: "SMTP не настроен" }, { status: 400 });
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.smtp_host,
        port: parseInt(cfg.smtp_port || "587"),
        secure: cfg.smtp_port === "465",
        auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
      });
      await transporter.verify();
      return NextResponse.json({
        ok: true,
        message: "SMTP подключение успешно!",
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === "send") {
    if (!requireConfirmation(body)) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }
    const subject = cleanText(body.subject, 160);
    const html = sanitizeEmailHtml(body.html);
    const recipients = Array.isArray(body.recipients)
      ? [...new Set(body.recipients.map(normalizeEmail).filter(Boolean) as string[])]
      : [];
    const isTest = body.test === true;
    if (!subject || !html || recipients.length === 0) {
      return NextResponse.json(
        { error: "Заполните все поля" },
        { status: 400 },
      );
    }
    if (recipients.length > 500) {
      return NextResponse.json({ error: "Слишком много получателей за один запуск" }, { status: 400 });
    }
    if (isTest && recipients.length !== 1) {
      return NextResponse.json({ error: "Тестовое письмо можно отправить только одному получателю" }, { status: 400 });
    }
    let recipientsToSend = recipients;
    if (!isTest) {
      const allowedRecipients = await getTenantAudienceEmails(tenantId);
      recipientsToSend = recipients.filter((email) => allowedRecipients.has(email));
      if (recipientsToSend.length !== recipients.length) {
        return NextResponse.json(
          { error: "Получатели должны быть из базы текущего сайта" },
          { status: 400 },
        );
      }
    }
    const cfg = await getSmtpConfig();
    if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
      return NextResponse.json(
        {
          error: "SMTP не настроен. Настройте в разделе Email → Настройки SMTP",
        },
        { status: 400 },
      );
    }
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "587"),
      secure: cfg.smtp_port === "465",
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });

    // Send in batches of 50 with 2s pause between batches
    const BATCH_SIZE = 50;
    let sent = 0;
    const errors: string[] = [];
    const from = `"${cfg.smtp_from_name || "ПилоРус"}" <${cfg.smtp_from || cfg.smtp_user}>`;

    for (let i = 0; i < recipientsToSend.length; i += BATCH_SIZE) {
      const batch = recipientsToSend.slice(i, i + BATCH_SIZE);
      for (const email of batch) {
        try {
          await transporter.sendMail({ from, to: email, subject, html });
          sent++;
        } catch (e: any) {
          errors.push(`${email}: ${e.message}`);
        }
      }
      // Pause 2s between batches to avoid rate limiting (skip after last batch)
      if (i + BATCH_SIZE < recipientsToSend.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      errors,
      batches: Math.ceil(recipientsToSend.length / BATCH_SIZE),
    });
  }

  if (action === "register_clients") {
    if (!requireConfirmation(body)) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }
    // Parse list: "email" or "email,Имя" per line
    const lines = Array.isArray(body.lines)
      ? body.lines.map((line) => cleanText(line, 500)).filter(Boolean).slice(0, 200)
      : [];
    if (!lines.length)
      return NextResponse.json({ error: "Список пустой" }, { status: 400 });

    const cfg = await getSmtpConfig();
    const hasSmtp = cfg.smtp_host && cfg.smtp_user && cfg.smtp_pass;

    const from = `"${cfg.smtp_from_name || "ПилоРус"}" <${cfg.smtp_from || cfg.smtp_user}>`;
    let transporter: nodemailer.Transporter | null = null;
    if (hasSmtp) {
      transporter = nodemailer.createTransport({
        host: cfg.smtp_host,
        port: parseInt(cfg.smtp_port || "587"),
        secure: cfg.smtp_port === "465",
        auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
      });
    }

    const results = {
      created: 0,
      existing: 0,
      emailsSent: 0,
      errors: [] as string[],
    };

    for (const line of lines) {
      const parts = line.trim().split(/[,;]/);
      const email = normalizeEmail(parts[0]);
      const name = cleanText(parts[1], 120);
      if (!email) continue;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.existing++;
        continue;
      }

      // Generate readable password: 3 words style e.g. "Oak-47-Pine"
      const words = [
        "Лес",
        "Дуб",
        "Сосна",
        "Клён",
        "Берёза",
        "Ель",
        "Пила",
        "Доска",
        "Брус",
      ];
      const w1 = words[Math.floor(Math.random() * words.length)];
      const num = Math.floor(10 + Math.random() * 89);
      const w2 = words[Math.floor(Math.random() * words.length)];
      const password = `${w1}${num}${w2}`;

      try {
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.create({
          data: {
            tenantId,
            email,
            name: name || email.split("@")[0],
            passwordHash,
            role: "USER",
          },
        });
        results.created++;

        if (transporter) {
          const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:Arial,sans-serif;background:#f5f5f5">
<div style="max-width:520px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden">
<div style="background:linear-gradient(135deg,#e8700a,#f59e0b);padding:28px 32px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">ПилоРус</h1>
<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Ваш личный кабинет готов</p>
</div>
<div style="padding:28px 32px">
<p style="color:#444;font-size:15px;margin:0 0 16px">Здравствуйте${name ? ", " + name : ""}!</p>
<p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 20px">Для вас создан личный кабинет на сайте <b>pilo-rus.ru</b>. Теперь вы можете отслеживать заказы, сохранять адреса и управлять покупками.</p>
<div style="background:#fff8f0;border:1.5px solid #fde68a;border-radius:10px;padding:16px 20px;margin:0 0 20px">
<p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:700">Ваши данные для входа:</p>
<p style="margin:0 0 4px;font-size:14px;color:#444">📧 Логин: <b>${email}</b></p>
<p style="margin:0;font-size:14px;color:#444">🔑 Пароль: <b style="font-size:18px;letter-spacing:1px;color:#e8700a">${password}</b></p>
</div>
<a href="https://pilo-rus.ru/login" style="display:inline-block;background:#e8700a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Войти в личный кабинет →</a>
<p style="margin:20px 0 0;font-size:12px;color:#aaa">Рекомендуем сменить пароль после первого входа в разделе «Настройки».</p>
</div>
<div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee;text-align:center">
<p style="margin:0;font-size:12px;color:#aaa">ПилоРус · Химки МО · <a href="https://pilo-rus.ru" style="color:#e8700a">pilo-rus.ru</a> · ${DEFAULT_SETTINGS.phone}</p>
</div>
</div></body></html>`;
          try {
            await transporter.sendMail({
              from,
              to: email,
              subject: "Ваш личный кабинет на pilo-rus.ru",
              html: welcomeHtml,
            });
            results.emailsSent++;
          } catch {
            // Email failed but user was created — not critical
          }
        }
      } catch (e: any) {
        results.errors.push(`${email}: ${e.message}`);
      }
    }

    return NextResponse.json({ ok: true, ...results });
  }

  if (action === "import_emails") {
    if (!requireConfirmation(body)) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }
    const source = body.source === "scanner" ? "scanner" : "import";
    const emails = Array.isArray(body.emails)
      ? [
          ...new Set(
            body.emails.map(normalizeEmail).filter(Boolean) as string[],
          ),
        ].slice(0, 1000)
      : [];

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "Нет валидных email для импорта" },
        { status: 400 },
      );
    }

    const [users, orders, existingNewsletter] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, email: { in: emails } },
        select: { email: true },
      }),
      prisma.order.findMany({
        where: { tenantId, guestEmail: { in: emails }, deletedAt: null },
        select: { guestEmail: true },
      }),
      prisma.newsletterSubscriber.findMany({
        where: { email: { in: emails } },
        select: { email: true, active: true, tenantId: true },
      }),
    ]);

    const knownEmails = new Set([
      ...users.map((user) => user.email.toLowerCase()),
      ...orders.flatMap((order) => {
        const email = normalizeEmail(order.guestEmail);
        return email ? [email] : [];
      }),
    ]);
    const newsletterByEmail = new Map(
      existingNewsletter.map((item) => [item.email.toLowerCase(), item]),
    );
    const results = {
      created: 0,
      existing: 0,
      reactivated: 0,
      errors: [] as string[],
    };

    for (const email of emails) {
      const existing = newsletterByEmail.get(email);
      if (existing) {
        if (existing.tenantId !== tenantId) {
          results.existing++;
        } else if (!existing.active) {
          await prisma.newsletterSubscriber.update({
            where: { email },
            data: { active: true, source },
          });
          results.reactivated++;
        } else {
          results.existing++;
        }
        continue;
      }

      if (knownEmails.has(email)) {
        results.existing++;
        continue;
      }

      try {
        await prisma.newsletterSubscriber.create({
          data: { tenantId, email, source, active: true },
        });
        results.created++;
      } catch (error: any) {
        results.errors.push(
          `${email}: ${error.message || "не удалось сохранить"}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      total: emails.length,
      count: results.created + results.reactivated,
      ...results,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
