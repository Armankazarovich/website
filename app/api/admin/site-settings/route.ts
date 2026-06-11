export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { upsertSiteSetting } from "@/lib/tenant-settings";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const rows = await prisma.siteSettings.findMany({ where: { tenantId } });
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return NextResponse.json(result);
}

// Whitelist допустимых ключей настроек
const ALLOWED_KEYS = new Set([
  // Базовые настройки сайта
  "site_name", "site_description", "business_type", "terminal_profile", "terminal_enabled_modules",
  // Контакты
  "phone", "phone_link", "phone2", "phone2_link", "phone3", "phone3_link",
  "email", "min_order",
  // Адрес и геолокация (используется в SEO-автогенерации)
  "address", "address_map", "map_link", "company_city", "delivery_region", "pickup_coords",
  // Режим работы
  "working_hours", "working_hours_short", "work_hours",
  // Тексты страниц
  "contacts_description", "about_text", "delivery_text",
  // Реквизиты компании
  "company_name", "legal_full_name", "inn", "ogrn", "kpp",
  "settlement_account", "bank_name", "correspondent_account", "bik",
  "okpo", "okato", "oktmo",
  // SEO + верификация
  "seo_title", "seo_description", "site_url", "public_site_url", "yandex_verification", "google_verification",
  // Аналитика
  "yandex_metrika_id", "google_analytics_id",
  "yandex_metrika_goal_order_id", "yandex_metrika_goal_lead_id", "yandex_metrika_goal_phone_id",
  "yandex_metrika_goal_messenger_id", "yandex_metrika_goal_cart_id",
  "yandex_metrika_goal_checkout_id", "yandex_metrika_goal_engaged_id",
  // Интеграции
  "google_sheets_id", "telegram_bot_token", "telegram_chat_id",
  // Мессенджеры (кнопки заказа)
  "whatsapp_enabled", "whatsapp_number", "whatsapp_message",
  "telegram_enabled", "telegram_username", "telegram_message",
  // Виджет связи
  "widget_enabled", "widget_position", "widget_label", "widget_show_email",
  // Социальные сети (в виджете)
  "social_whatsapp", "social_telegram", "social_vk", "social_max",
  // Бренд и PWA
  "logo_url", "site_logo_url", "pwa_logo_url",
  // Футер
  "footer_copyright",
  // Водяной знак
  "watermark_enabled", "watermark_config", "watermark_backup",
  // Внешний вид / палитры
  "enabled_palettes", "default_palette", "palettes_enabled",
  "photo_aspect_ratio", "card_style",
  "product_page_show_reviews", "product_page_show_related",
  "product_page_show_calculator", "product_page_show_breadcrumbs",
  "checkout_allow_pickup", "checkout_allow_delivery", "checkout_allow_guest",
  "checkout_show_promo", "checkout_require_comment",
  "product_type_settings",
  "direct_public_url", "yandex_direct_public_url", "direct_region_ids",
  "yandex_direct_region_ids", "yandex_business_id",
  "migration_20260512_whatsapp_hidden",
  // Арай
  "aray_enabled",
]);

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Settings payload must be an object" }, { status: 400 });
  }
  const rawSettings = body as Record<string, unknown>;
  if (rawSettings.confirm !== true) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }
  const tenantId = getCurrentTenantId();
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(rawSettings)) {
    if (key === "confirm") continue;
    if (!ALLOWED_KEYS.has(key)) { rejected.push(key); continue; }
    await upsertSiteSetting(key, String(value), tenantId);
  }
  revalidateTag("store-shell-data");
  revalidatePath("/", "layout");
  revalidatePath("/contacts");
  revalidatePath("/delivery");
  return NextResponse.json({ ok: true, ...(rejected.length ? { rejected } : {}) });
}
