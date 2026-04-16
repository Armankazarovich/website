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
  "site_name", "site_description", "phone", "phone_link", "phone2", "phone2_link",
  "phone3", "phone3_link", "email", "address", "working_hours", "working_hours_short",
  "google_sheets_id", "yandex_metrika_id", "telegram_bot_token", "telegram_chat_id",
  "watermark_enabled", "watermark_config", "watermark_backup",
  "enabled_palettes", "default_palette",
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
