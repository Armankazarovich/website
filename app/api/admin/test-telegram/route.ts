export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const STAFF_ROLES = ["ADMIN", "MANAGER"];

export async function POST() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN не задан в .env" });
  if (!chatId) return NextResponse.json({ ok: false, error: "TELEGRAM_CHAT_ID не задан в .env" });

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ *Тест уведомлений ПилоРус*\n\nТелеграм подключён и работает корректно.`,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json({
        ok: false,
        error: data.description || "Ошибка Telegram API",
        chatId,
        tokenPrefix: token.slice(0, 10) + "...",
      });
    }

    return NextResponse.json({ ok: true, chatId, tokenPrefix: token.slice(0, 10) + "..." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
