export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

async function getSmtpConfig() {
  const keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_from_name"];
  const rows = await prisma.siteSettings.findMany({ where: { key: { in: keys } } });
  const cfg: Record<string, string> = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "smtp_settings") {
    const cfg = await getSmtpConfig();
    // Don't expose password
    return NextResponse.json({ ...cfg, smtp_pass: cfg.smtp_pass ? "***" : "" });
  }

  // Get email subscribers (users with email + orders)
  const [users, orders] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true } }),
    prisma.order.findMany({ select: { guestEmail: true, guestName: true, createdAt: true } }),
  ]);

  // Build unique email list
  const emailMap = new Map<string, { name: string; source: string; date: Date }>();
  for (const u of users) {
    if (u.email) emailMap.set(u.email, { name: u.name || "", source: "registered", date: u.createdAt });
  }
  for (const o of orders) {
    if (o.guestEmail && !emailMap.has(o.guestEmail)) {
      emailMap.set(o.guestEmail, { name: o.guestName || "", source: "order", date: o.createdAt });
    }
  }

  const subscribers = Array.from(emailMap.entries()).map(([email, info]) => ({
    email,
    ...info,
  }));

  return NextResponse.json({ subscribers, total: subscribers.length });
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  if (action === "save_smtp") {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_from_name } = body;
    const settings = [
      { key: "smtp_host", value: smtp_host || "" },
      { key: "smtp_port", value: String(smtp_port || "587") },
      { key: "smtp_user", value: smtp_user || "" },
      { key: "smtp_from", value: smtp_from || "" },
      { key: "smtp_from_name", value: smtp_from_name || "" },
    ];
    if (smtp_pass && smtp_pass !== "***") {
      settings.push({ key: "smtp_pass", value: smtp_pass });
    }
    await Promise.all(
      settings.map(({ key, value }) =>
        prisma.siteSettings.upsert({
          where: { key },
          create: { id: key, key, value },
          update: { value },
        })
      )
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
      return NextResponse.json({ ok: true, message: "SMTP подключение успешно!" });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === "send") {
    const { subject, html, recipients } = body;
    if (!subject || !html || !recipients?.length) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    }
    const cfg = await getSmtpConfig();
    if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
      return NextResponse.json(
        { error: "SMTP не настроен. Настройте в разделе Email → Настройки SMTP" },
        { status: 400 }
      );
    }
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "587"),
      secure: cfg.smtp_port === "465",
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });
    let sent = 0;
    const errors: string[] = [];
    for (const email of recipients) {
      try {
        await transporter.sendMail({
          from: `"${cfg.smtp_from_name || "ПилоРус"}" <${cfg.smtp_from || cfg.smtp_user}>`,
          to: email,
          subject,
          html,
        });
        sent++;
      } catch (e: any) {
        errors.push(`${email}: ${e.message}`);
      }
    }
    return NextResponse.json({ ok: true, sent, errors });
  }

  if (action === "import_emails") {
    // Import plain list of emails
    const { emails } = body; // string[]
    return NextResponse.json({ ok: true, count: emails?.length || 0 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
