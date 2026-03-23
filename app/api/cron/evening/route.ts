import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return NextResponse.json({ error: "Telegram not configured" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [newOrders, confirmed, delivered, cancelled, totalRevenue] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow }, status: "CONFIRMED" } }),
    prisma.order.count({ where: { updatedAt: { gte: today, lt: tomorrow }, status: "DELIVERED" } }),
    prisma.order.count({ where: { updatedAt: { gte: today, lt: tomorrow }, status: "CANCELLED" } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow }, status: { notIn: ["CANCELLED"] } },
      _sum: { totalAmount: true },
    }),
  ]);

  const revenue = Number(totalRevenue._sum.totalAmount || 0);
  const dateStr = today.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  let rating = "👍 Хороший день!";
  if (newOrders === 0) rating = "😴 Тихий день — завтра будет лучше!";
  else if (newOrders >= 5) rating = "🔥 Отличный день! Команда молодцы!";
  else if (newOrders >= 3) rating = "💪 Хороший результат! Так держать!";

  const text = [
    `📊 *Итоги дня — ${dateStr}*`,
    ``,
    `🛒 Новых заказов: *${newOrders}*`,
    `✅ Подтверждено: *${confirmed}*`,
    `🎉 Доставлено: *${delivered}*`,
    cancelled > 0 ? `❌ Отменено: *${cancelled}*` : null,
    ``,
    `💰 *Выручка дня: ${revenue.toLocaleString("ru-RU")} ₽*`,
    ``,
    rating,
    ``,
    `До завтра, команда! 🌙`,
  ].filter(Boolean).join("\n");

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
  });

  return NextResponse.json({ ok: true });
}
