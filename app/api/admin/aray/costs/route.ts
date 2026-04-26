export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { USD_RUB_RATE } from "@/lib/api-pricing";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/aray/costs
// Возвращает агрегированные расходы по периодам и провайдерам.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") || 30);
    const limit = Number(url.searchParams.get("limit") || 50);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // ── Параллельная загрузка всех агрегатов ──────────────────────────────
    const [
      todayAgg,
      weekAgg,
      monthAgg,
      allTimeAgg,
      byProviderMonth,
      byModelMonth,
      bySourceMonth,
      recentLogs,
      dailySeries,
      topUsers,
      subscriptions,
    ] = await Promise.all([
      // Сегодня
      (prisma as any).arayTokenLog.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { costUsd: true, costRub: true, inputTokens: true, outputTokens: true, characters: true },
        _count: { _all: true },
      }),
      // Неделя
      (prisma as any).arayTokenLog.aggregate({
        where: { createdAt: { gte: weekStart } },
        _sum: { costUsd: true, costRub: true },
        _count: { _all: true },
      }),
      // Месяц
      (prisma as any).arayTokenLog.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true, costRub: true },
        _count: { _all: true },
      }),
      // Всего за всё время
      (prisma as any).arayTokenLog.aggregate({
        _sum: { costUsd: true, costRub: true },
        _count: { _all: true },
      }),
      // Разбивка по провайдерам за месяц
      (prisma as any).arayTokenLog.groupBy({
        by: ["provider"],
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true, costRub: true, inputTokens: true, outputTokens: true, characters: true },
        _count: { _all: true },
      }),
      // Разбивка по моделям за месяц
      (prisma as any).arayTokenLog.groupBy({
        by: ["provider", "model", "tier"],
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true, costRub: true },
        _count: { _all: true },
        orderBy: { _sum: { costUsd: "desc" } },
      }),
      // Разбивка по источнику (voice-mode, store, admin, cabinet)
      (prisma as any).arayTokenLog.groupBy({
        by: ["source"],
        where: { createdAt: { gte: monthStart }, source: { not: null } },
        _sum: { costUsd: true, costRub: true },
        _count: { _all: true },
      }),
      // Последние N запросов
      (prisma as any).arayTokenLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          provider: true,
          model: true,
          tier: true,
          inputTokens: true,
          outputTokens: true,
          characters: true,
          costUsd: true,
          costRub: true,
          feature: true,
          source: true,
          createdAt: true,
          userId: true,
          sessionId: true,
        },
      }),
      // По дням за период
      prisma.$queryRaw<Array<{ day: Date; provider: string; cost_usd: number; cost_rub: number; calls: bigint }>>`
        SELECT
          DATE_TRUNC('day', "createdAt") AS day,
          provider,
          SUM("costUsd")::float AS cost_usd,
          SUM("costRub")::float AS cost_rub,
          COUNT(*) AS calls
        FROM "ArayTokenLog"
        WHERE "createdAt" >= ${periodStart}
        GROUP BY day, provider
        ORDER BY day ASC
      `,
      // Топ-5 пользователей по тратам за месяц
      (prisma as any).arayTokenLog.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: monthStart }, userId: { not: null } },
        _sum: { costUsd: true, costRub: true },
        _count: { _all: true },
        orderBy: { _sum: { costUsd: "desc" } },
        take: 5,
      }),
      // Подписки (постоянные)
      (prisma as any).apiSubscription.findMany({
        orderBy: [{ active: "desc" }, { costRub: "desc" }],
      }).catch(() => []),
    ]);

    // ── Имена пользователей для топ-5 ───────────────────────────────────
    const userIds = topUsers.map((u: any) => u.userId).filter(Boolean);
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, role: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // ── Резюме подписок ───────────────────────────────────────────────────
    const activeSubs = subscriptions.filter((s: any) => s.active);
    const monthlyFixedRub = activeSubs.reduce((sum: number, s: any) => {
      if (s.billingType === "monthly") {
        const rub = s.costRub || (s.costUsd ? s.costUsd * USD_RUB_RATE : 0);
        return sum + rub;
      }
      if (s.billingType === "yearly") {
        const rub = s.costRub || (s.costUsd ? s.costUsd * USD_RUB_RATE : 0);
        return sum + rub / 12;
      }
      return sum;
    }, 0);

    return NextResponse.json({
      ok: true,
      summary: {
        today:    { calls: todayAgg._count._all,    costUsd: todayAgg._sum.costUsd || 0,    costRub: todayAgg._sum.costRub || 0    },
        week:     { calls: weekAgg._count._all,     costUsd: weekAgg._sum.costUsd || 0,     costRub: weekAgg._sum.costRub || 0     },
        month:    { calls: monthAgg._count._all,    costUsd: monthAgg._sum.costUsd || 0,    costRub: monthAgg._sum.costRub || 0    },
        allTime:  { calls: allTimeAgg._count._all,  costUsd: allTimeAgg._sum.costUsd || 0,  costRub: allTimeAgg._sum.costRub || 0  },
        monthlyFixedRub,
        usdRubRate: USD_RUB_RATE,
      },
      byProvider: byProviderMonth.map((p: any) => ({
        provider: p.provider,
        calls: p._count._all,
        costUsd: p._sum.costUsd || 0,
        costRub: p._sum.costRub || 0,
        inputTokens: p._sum.inputTokens || 0,
        outputTokens: p._sum.outputTokens || 0,
        characters: p._sum.characters || 0,
      })),
      byModel: byModelMonth.map((m: any) => ({
        provider: m.provider,
        model: m.model,
        tier: m.tier,
        calls: m._count._all,
        costUsd: m._sum.costUsd || 0,
        costRub: m._sum.costRub || 0,
      })),
      bySource: bySourceMonth.map((s: any) => ({
        source: s.source,
        calls: s._count._all,
        costUsd: s._sum.costUsd || 0,
        costRub: s._sum.costRub || 0,
      })),
      dailySeries: dailySeries.map((d: any) => ({
        day: d.day,
        provider: d.provider,
        costUsd: d.cost_usd || 0,
        costRub: d.cost_rub || 0,
        calls: Number(d.calls),
      })),
      topUsers: topUsers.map((u: any) => {
        const userInfo = userMap.get(u.userId);
        return {
          userId: u.userId,
          name: userInfo?.name || null,
          email: userInfo?.email || null,
          role: userInfo?.role || null,
          calls: u._count._all,
          costUsd: u._sum.costUsd || 0,
          costRub: u._sum.costRub || 0,
        };
      }),
      recent: recentLogs,
      subscriptions: subscriptions.map((s: any) => ({
        ...s,
        costUsd: s.costUsd ? Number(s.costUsd) : null,
        costRub: s.costRub ? Number(s.costRub) : null,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/admin/aray/costs]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}
