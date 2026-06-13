export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { resolveTelegramCredentials, maskTelegramChatId } from "@/lib/telegram-config";

const SITE_URL = process.env.NEXTAUTH_URL || "https://pilo-rus.ru";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.notifications", role });
  if (!moduleAccess.authorized) return moduleAccess;
  return { authorized: true as const, session };
}

// GET — check current webhook status
export async function GET() {
  const access = await checkAdmin();
  if (!access.authorized) return access.response;

  const credentials = await resolveTelegramCredentials({ requireChatId: false });
  if (!credentials.ok) {
    return NextResponse.json({
      configured: false,
      error: credentials.error,
      source: credentials.source,
      missing: credentials.missing,
    });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${credentials.token}/getWebhookInfo`);
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
  const access = await checkAdmin();
  if (!access.authorized) return access.response;

  const body = await req.json().catch(() => ({}));
  const action = body.action || "setup";

  if (action === "test") {
    // Send a test message to the chat
    const credentials = await resolveTelegramCredentials();
    if (!credentials.ok || !credentials.chatId) {
      const error = credentials.ok ? "Telegram не настроен: telegram_chat_id" : credentials.error;
      const missing = credentials.ok ? ["telegram_chat_id"] : credentials.missing;
      return NextResponse.json({
        ok: false,
        error,
        source: credentials.source,
        missing,
      }, { status: 400 });
    }
    const res = await fetch(`https://api.telegram.org/bot${credentials.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text: `Тест соединения ПилоРус\n\nБот подключён и работает корректно.\nВремя: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
      }),
    });
    const data = await res.json();
    return NextResponse.json({
      ok: data.ok,
      error: data.description,
      source: credentials.source,
      chatId: maskTelegramChatId(credentials.chatId),
    });
  }

  // Setup webhook
  const webhookUrl = `${SITE_URL}/api/telegram`;
  const credentials = await resolveTelegramCredentials({ requireChatId: false });
  if (!credentials.ok) {
    return NextResponse.json({
      ok: false,
      error: credentials.error,
      source: credentials.source,
      missing: credentials.missing,
    }, { status: 400 });
  }

  try {
    // Delete old webhook first
    await fetch(`https://api.telegram.org/bot${credentials.token}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: false }),
    });

    // Set new webhook
    const res = await fetch(`https://api.telegram.org/bot${credentials.token}/setWebhook`, {
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
