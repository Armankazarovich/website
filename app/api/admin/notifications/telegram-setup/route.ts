export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.env.NEXTAUTH_URL || "https://pilo-rus.ru";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  return session && (role === "ADMIN" || role === "SUPER_ADMIN");
}

// GET — check current webhook status
export async function GET() {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!TOKEN) {
    return NextResponse.json({
      configured: false,
      error: "TELEGRAM_BOT_TOKEN не установлен в переменных окружения",
    });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ configured: false, error: data.description });
    }

    const info = data.result;
    const webhookUrl = info.url || "";
    const expectedUrl = `${SITE_URL}/api/telegram`;
    const isCorrect = webhookUrl === expectedUrl;

    return NextResponse.json({
      configured: !!webhookUrl,
      correct: isCorrect,
      webhookUrl,
      expectedUrl,
      pendingUpdateCount: info.pending_update_count ?? 0,
      lastErrorDate: info.last_error_date
        ? new Date(info.last_error_date * 1000).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
        : null,
      lastErrorMessage: info.last_error_message || null,
      maxConnections: info.max_connections ?? 40,
    });
  } catch (e) {
    return NextResponse.json({ configured: false, error: "Ошибка соединения с Telegram API" });
  }
}

// POST — register/update webhook
export async function POST(req: NextRequest) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!TOKEN) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN не установлен" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action || "setup";

  if (action === "test") {
    // Send a test message to the chat
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      return NextResponse.json({ ok: false, error: "TELEGRAM_CHAT_ID не установлен" }, { status: 400 });
    }
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ *Тест соединения ПилоРус*\n\nBот подключён и работает корректно\\!\nВремя: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
        parse_mode: "MarkdownV2",
      }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: data.ok, error: data.description });
  }

  // Setup webhook
  const webhookUrl = `${SITE_URL}/api/telegram`;

  try {
    // Delete old webhook first
    await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: false }),
    });

    // Set new webhook
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        max_connections: 40,
      }),
    });
    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.description });
    }

    return NextResponse.json({
      ok: true,
      webhookUrl,
      message: "Webhook успешно настроен! Теперь кнопки в Telegram работают.",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Ошибка соединения с Telegram API" });
  }
}
