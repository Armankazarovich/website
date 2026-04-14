/**
 * /api/health — Публичный health check (для мониторинга извне).
 * /api/admin/health — Подробный (только для авторизованных).
 *
 * ARAY может вызывать это фоново для диагностики.
 * Внешние сервисы (UptimeRobot и т.д.) — /api/health.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { ok: boolean; ms?: number; error?: string; details?: string }> = {};

  // ── 1. База данных ────────────────────────────────────────────────────────
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, ms: Date.now() - dbStart };
  } catch (e: any) {
    checks.database = { ok: false, error: e.message?.slice(0, 100) };
  }

  // ── 2. Количество заказов (проверяем что таблицы есть) ─────────────────────
  try {
    const count = await prisma.order.count({ where: { deletedAt: null } });
    checks.orders = { ok: true, details: `${count} заказов` };
  } catch (e: any) {
    checks.orders = { ok: false, error: e.message?.slice(0, 100) };
  }

  // ── 3. ARAY API ключ ──────────────────────────────────────────────────────
  checks.aray_api = {
    ok: !!process.env.ANTHROPIC_API_KEY,
    details: process.env.ANTHROPIC_API_KEY ? "настроен" : "ОТСУТСТВУЕТ",
  };

  // ── 4. Telegram бот ───────────────────────────────────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      checks.telegram = { ok: data.ok === true, details: data.result?.username || "ошибка" };
    } catch (e: any) {
      checks.telegram = { ok: false, error: "таймаут или недоступен" };
    }
  } else {
    checks.telegram = { ok: false, error: "TELEGRAM_BOT_TOKEN не настроен" };
  }

  // ── 5. SMTP (проверяем наличие переменных, не отправляем) ──────────────────
  checks.email = {
    ok: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    details: process.env.SMTP_HOST || "не настроен",
  };

  // ── 6. Push VAPID ─────────────────────────────────────────────────────────
  checks.push = {
    ok: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    details: process.env.VAPID_PUBLIC_KEY ? "ключи настроены" : "ОТСУТСТВУЮТ",
  };

  // ── 7. Google AI ──────────────────────────────────────────────────────────
  checks.google_ai = {
    ok: !!process.env.GOOGLE_AI_API_KEY,
    details: process.env.GOOGLE_AI_API_KEY ? "настроен" : "ОТСУТСТВУЕТ",
  };

  // ── 8. Диск (свободное место — приблизительно) ────────────────────────────
  // На VPS можно проверить через /proc, здесь просто помечаем как "не проверяем"
  checks.disk = { ok: true, details: "проверь вручную на VPS" };

  // ── Итог ──────────────────────────────────────────────────────────────────
  // Critical checks: database, orders, telegram, email, push
  // Optional checks: aray_api, google_ai, disk (don't affect overall status)
  const CRITICAL_KEYS = ["database", "orders", "telegram", "email", "push"];
  const criticalOk = CRITICAL_KEYS.every(k => checks[k]?.ok !== false);
  const allOk = Object.values(checks).every(c => c.ok);
  const totalMs = Date.now() - start;

  return NextResponse.json({
    status: allOk ? "healthy" : criticalOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    responseMs: totalMs,
    checks,
    ...((!allOk && criticalOk) ? { note: "Некритичные сервисы не настроены (API ключи)" } : {}),
  }, {
    status: criticalOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
