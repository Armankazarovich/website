export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const tips = [
  "Уточняйте адрес доставки у новых клиентов — это экономит время всей команды! 📍",
  "Перезванивайте клиентам в течение 30 минут после заказа — конверсия выше на 40%! 📞",
  "Если клиент сомневается — предложите небольшой объём для пробы. Лояльность растёт! 🤝",
  "Проверьте остатки на складе — лучше предупредить клиента заранее, чем разочаровать! 📦",
  "Хорошее настроение менеджера — это тоже продажа. Улыбайтесь даже по телефону! 😊",
  "Спрашивайте клиентов откуда они узнали о нас — это помогает развивать маркетинг! 📊",
  "Предлагайте сопутствующие товары при оформлении — средний чек растёт! 💡",
];

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

  const [activeOrders, newToday, inDelivery] = await Promise.all([
    prisma.order.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: { in: ["SHIPPED", "IN_DELIVERY"] } } }),
  ]);

  const tip = tips[today.getDay() % tips.length];
  const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const dayName = dayNames[today.getDay()];
  const dateStr = today.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const text = [
    `☀️ *Доброе утро, команда ПилоРус!*`,
    `📅 ${dayName}, ${dateStr}`,
    ``,
    `📊 *Текущая картина:*`,
    `🔄 Активных заказов: *${activeOrders}*`,
    `🆕 Новых сегодня: *${newToday}*`,
    `🚚 На отгрузке/в пути: *${inDelivery}*`,
    ``,
    `💡 *Совет дня:*`,
    tip,
    ``,
    `Удачного рабочего дня! 💪`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
  });

  return NextResponse.json({ ok: true });
}
