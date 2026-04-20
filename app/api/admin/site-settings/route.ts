export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && session.user.role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.siteSettings.findMany();
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return NextResponse.json(result);
}

// Whitelist допустимых ключей настроек
const ALLOWED_KEYS = new Set([
  // Базовые настройки сайта
  "site_name", "site_description",
  // Контакты
  "phone", "phone_link", "phone2", "phone2_link", "phone3", "phone3_link",
  "email", "min_order",
  // Адрес и геолокация (используется в SEO-автогенерации)
  "address", "address_map", "company_city", "delivery_region", "pickup_coords",
  // Режим работы
  "working_hours", "working_hours_short",
  // Тексты страниц
  "contacts_description", "about_text", "delivery_text",
  // Реквизиты компании
  "company_name", "inn", "ogrn",
  // SEO + верификация
  "seo_title", "seo_description", "yandex_verification", "google_verification",
  // Аналитика
  "yandex_metrika_id", "google_analytics_id",
  // Интеграции
  "google_sheets_id", "telegram_bot_token", "telegram_chat_id",
  // Мессенджеры (кнопки заказа)
  "whatsapp_enabled", "whatsapp_number", "whatsapp_message",
  "telegram_enabled", "telegram_username", "telegram_message",
  // Виджет связи
  "widget_enabled", "widget_position", "widget_label", "widget_show_email",
  // Социальные сети (в виджете)
  "social_whatsapp", "social_telegram", "social_vk",
  // Футер
  "footer_copyright",
  // Водяной знак
  "watermark_enabled", "watermark_config", "watermark_backup",
  // Внешний вид / палитры
  "enabled_palettes", "default_palette", "palettes_enabled",
  "photo_aspect_ratio", "card_style",
  // Арай
  "aray_enabled",
]);

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: Record<string, string> = await req.json();
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(key)) { rejected.push(key); continue; }
    await prisma.siteSettings.upsert({
      where: { key },
      create: { id: key, key, value: String(value) },
      update: { value: String(value) },
    });
  }
  return NextResponse.json({ ok: true, ...(rejected.length ? { rejected } : {}) });
}
