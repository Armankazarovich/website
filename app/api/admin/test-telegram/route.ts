export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveTelegramCredentials, maskTelegramChatId } from "@/lib/telegram-config";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function POST() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const credentials = await resolveTelegramCredentials();
  if (!credentials.ok || !credentials.chatId) {
    const error = credentials.ok ? "Telegram не настроен: telegram_chat_id" : credentials.error;
    const missing = credentials.ok ? ["telegram_chat_id"] : credentials.missing;
    return NextResponse.json({
      ok: false,
      error,
      source: credentials.source,
      missing,
    });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${credentials.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text: `✅ *Тест уведомлений ПилоРус*\n\nТелеграм подключён и работает корректно.`,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json({
        ok: false,
        error: data.description || "Ошибка Telegram API",
        chatId: maskTelegramChatId(credentials.chatId),
        source: credentials.source,
      });
    }

    return NextResponse.json({
      ok: true,
      chatId: maskTelegramChatId(credentials.chatId),
      source: credentials.source,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
