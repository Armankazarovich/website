export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { classifySource, humanizeSource, type SourceGroup } from "@/lib/utm";
import { getYandexDirectSpendSummary } from "@/lib/yandex-direct";
import {
  getStoredMetrikaGoals,
  getYandexMetrikaTrafficSummary,
} from "@/lib/yandex-metrika";
import type { Prisma } from "@prisma/client";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"];
const RANGE_DAYS = [7, 30, 90] as const;
const LIVE_ORDER_WHERE: Prisma.OrderWhereInput = {
  deletedAt: null,
  status: { notIn: ["CANCELLED"] },
};

type ReadinessStatus = "ready" | "attention" | "missing";

function groupCount(record: { _count?: true | { _all?: number | null } }) {
  return typeof record._count === "object" ? (record._count._all ?? 0) : 0;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseRangeDays(request: Request) {
  const value = Number(new URL(request.url).searchParams.get("range") || 30);
  return RANGE_DAYS.includes(value as (typeof RANGE_DAYS)[number])
    ? (value as (typeof RANGE_DAYS)[number])
    : 30;
}

function buildDaySlots(now: Date, rangeDays: number) {
  const slots: {
    label: string;
    revenue: number;
    orders: number;
    date: string;
  }[] = [];

  for (let i = rangeDays - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    slots.push({
      label: date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      }),
      date: date.toISOString(),
      revenue: 0,
      orders: 0,
    });
  }

  return slots;
}

function moneyValue(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function rate(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : null;
}

function hasTrackingMark(order: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  gclid?: string | null;
  yclid?: string | null;
  referrer?: string | null;
}) {
  return Boolean(
    order.utmSource ||
      order.utmMedium ||
      order.utmCampaign ||
      order.gclid ||
      order.yclid ||
      order.referrer,
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tenantId = getCurrentTenantId();
  const now = new Date();
  const rangeDays = parseRangeDays(request);
  const daySlots = buildDaySlots(now, rangeDays);
  const since = startOfDay(new Date(daySlots[0]?.date || now));
  const to = endOfDay(now);
  const previousTo = new Date(since.getTime() - 1);
  const previousFrom = startOfDay(previousTo);
  previousFrom.setDate(previousFrom.getDate() - (rangeDays - 1));

  const liveOrderWhere: Prisma.OrderWhereInput = {
    ...LIVE_ORDER_WHERE,
    tenantId,
  };

  const [
    ordersInPeriod,
    previousOrders,
    topProductItems,
    statusCounts,
    clientStats,
    paymentStats,
    contactStats,
    settingsRows,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { ...liveOrderWhere, createdAt: { gte: since, lte: to } },
      select: {
        createdAt: true,
        totalAmount: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        gclid: true,
        yclid: true,
        referrer: true,
      },
    }),

    prisma.order.findMany({
      where: {
        ...liveOrderWhere,
        createdAt: { gte: previousFrom, lte: previousTo },
      },
      select: { totalAmount: true },
    }),

    prisma.orderItem.findMany({
      where: { order: liveOrderWhere },
      select: { productName: true, price: true, quantity: true },
    }),

    prisma.order.groupBy({
      by: ["status"],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    }),

    prisma.order.groupBy({
      by: ["guestPhone"],
      where: { ...liveOrderWhere, guestPhone: { not: null } },
      _count: { _all: true },
      having: { guestPhone: { _count: { gt: 1 } } },
    }),

    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: liveOrderWhere,
      _count: { _all: true },
    }),

    prisma.order.groupBy({
      by: ["contactMethod"],
      where: liveOrderWhere,
      _count: { _all: true },
    }),

    prisma.siteSettings.findMany({ where: { tenantId } }),
  ]);

  const sourceAgg: Record<SourceGroup, { count: number; revenue: number }> = {
    direct_ad: { count: 0, revenue: 0 },
    google_ads: { count: 0, revenue: 0 },
    organic: { count: 0, revenue: 0 },
    social: { count: 0, revenue: 0 },
    referral: { count: 0, revenue: 0 },
    direct: { count: 0, revenue: 0 },
    other: { count: 0, revenue: 0 },
  };
  const campaignAgg: Record<
    string,
    { count: number; revenue: number; group: SourceGroup }
  > = {};

  for (const order of ordersInPeriod) {
    const group = classifySource(order);
    const value = moneyValue(order.totalAmount);
    sourceAgg[group].count += 1;
    sourceAgg[group].revenue += value;

    if (order.utmCampaign) {
      const key = order.utmCampaign;
      if (!campaignAgg[key]) campaignAgg[key] = { count: 0, revenue: 0, group };
      campaignAgg[key].count += 1;
      campaignAgg[key].revenue += value;
    }
  }

  const sourceStats = (Object.keys(sourceAgg) as SourceGroup[])
    .map((group) => ({
      group,
      label: humanizeSource(group).label,
      count: sourceAgg[group].count,
      revenue: sourceAgg[group].revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  const campaignStats = Object.entries(campaignAgg)
    .map(([campaign, value]) => ({
      campaign,
      group: value.group,
      label: humanizeSource(value.group).label,
      count: value.count,
      revenue: value.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, 10);

  const settings = Object.fromEntries(
    settingsRows.map((row) => [row.key, row.value]),
  );
  const storedGoals = getStoredMetrikaGoals(settings);
  const [directSpend, metrikaTraffic] = await Promise.all([
    getYandexDirectSpendSummary({ settings, from: since, to }),
    getYandexMetrikaTrafficSummary({ settings, from: since, to }),
  ]);

  for (const order of ordersInPeriod) {
    const day = startOfDay(order.createdAt);
    const slot = daySlots.find(
      (item) => new Date(item.date).getTime() === day.getTime(),
    );
    if (slot) {
      slot.revenue += moneyValue(order.totalAmount);
      slot.orders += 1;
    }
  }

  const totalRevenue30 = daySlots.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders30 = daySlots.reduce((sum, item) => sum + item.orders, 0);
  const avgOrder = totalOrders30 > 0 ? totalRevenue30 / totalOrders30 : 0;
  const previousRevenue = previousOrders.reduce(
    (sum, order) => sum + moneyValue(order.totalAmount),
    0,
  );
  const previousOrderCount = previousOrders.length;
  const previousAvgOrder =
    previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;
  const directRevenue = sourceAgg.direct_ad.revenue;
  const directRoas =
    directSpend.spend > 0 ? directRevenue / directSpend.spend : null;
  const attributedOrders = ordersInPeriod.filter(hasTrackingMark).length;
  const directSessions = directSpend.sessions || 0;
  const goalReady = Boolean(storedGoals.order || storedGoals.lead);
  const contactGoalReady = Boolean(storedGoals.phone || storedGoals.messenger);
  const goalsCount = Object.keys(storedGoals).length;

  const readinessItems: Array<{
    key: string;
    label: string;
    status: ReadinessStatus;
    text: string;
  }> = [
    {
      key: "orders",
      label: "Заказы",
      status: totalOrders30 > 0 ? "ready" : "attention",
      text:
        totalOrders30 > 0
          ? `${totalOrders30} заказов за ${rangeDays} дн., ${moneyValue(totalRevenue30).toLocaleString("ru-RU")} ₽`
          : `За ${rangeDays} дн. нет заказов. Как только появятся заказы, графики заполнятся автоматически.`,
    },
    {
      key: "direct",
      label: "Яндекс Direct",
      status: directSpend.available
        ? "ready"
        : directSpend.connected
          ? "attention"
          : "missing",
      text: directSpend.available
        ? `${directSpend.clicks} кликов, расход ${moneyValue(directSpend.spend).toLocaleString("ru-RU")} ₽`
        : directSpend.error || "Нужен OAuth Direct для расходов и кампаний.",
    },
    {
      key: "metrika",
      label: "Метрика",
      status: metrikaTraffic.available
        ? "ready"
        : metrikaTraffic.connected
          ? "attention"
          : "missing",
      text: metrikaTraffic.available
        ? `${metrikaTraffic.visits} визитов, ${metrikaTraffic.goalReaches} целей`
        : metrikaTraffic.error || "Нужен OAuth Метрики и выбранный счетчик.",
    },
    {
      key: "goals",
      label: "Цели",
      status: goalReady && contactGoalReady ? "ready" : "attention",
      text:
        goalReady && contactGoalReady
          ? `${goalsCount} целей ARAY сохранено для заказов, заявок и контактов.`
          : "Нужно создать и сохранить цели заказа, заявки, телефона и мессенджера.",
    },
    {
      key: "attribution",
      label: "Атрибуция",
      status: attributedOrders > 0 ? "ready" : "attention",
      text:
        attributedOrders > 0
          ? `${attributedOrders} заказов связаны с UTM, yclid, gclid или referrer.`
          : "Заказы пока не несут рекламные метки. UTM и yclid уже поддерживаются.",
    },
  ];
  const readinessScore = Math.round(
    (readinessItems.filter((item) => item.status === "ready").length /
      readinessItems.length) *
      100,
  );

  const repeatClients = clientStats.length;
  const topProducts = Object.values(
    topProductItems.reduce<
      Record<string, { name: string; revenue: number; count: number }>
    >((acc, item) => {
      const name = item.productName || "Товар без названия";
      if (!acc[name]) acc[name] = { name, revenue: 0, count: 0 };
      const quantity = Number(item.quantity);
      acc[name].revenue += Number(item.price) * quantity;
      acc[name].count += quantity;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    period: {
      days: rangeDays,
      from: since.toISOString(),
      to: to.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
      label: `${rangeDays} дней`,
      updatedAt: new Date().toISOString(),
    },
    chart: daySlots,
    totalRevenue30,
    totalOrders30,
    avgOrder,
    comparison: {
      previousRevenue,
      previousOrders: previousOrderCount,
      previousAvgOrder,
      revenueDeltaPct: percentChange(totalRevenue30, previousRevenue),
      ordersDeltaPct: percentChange(totalOrders30, previousOrderCount),
      avgOrderDeltaPct: percentChange(avgOrder, previousAvgOrder),
    },
    repeatClients,
    topProducts,
    statusCounts: statusCounts.map((status) => ({
      status: status.status,
      count: groupCount(status),
    })),
    paymentStats: paymentStats.map((payment) => ({
      method: payment.paymentMethod || "Не указан",
      count: groupCount(payment),
    })),
    contactStats: contactStats.map((contact) => ({
      method: contact.contactMethod || "Не указан",
      count: groupCount(contact),
    })),
    sourceStats,
    campaignStats,
    readiness: {
      score: readinessScore,
      items: readinessItems,
      goals: storedGoals,
    },
    funnel: {
      directClicks: directSpend.clicks,
      directSessions,
      metrikaVisits: metrikaTraffic.visits,
      metrikaGoals: metrikaTraffic.goalReaches,
      attributedOrders: sourceAgg.direct_ad.count,
      attributedRevenue: directRevenue,
      clickToSessionRate: rate(directSessions, directSpend.clicks),
      clickToGoalRate: rate(metrikaTraffic.goalReaches, directSpend.clicks),
      goalToOrderRate: rate(sourceAgg.direct_ad.count, metrikaTraffic.goalReaches),
    },
    marketing: {
      directSpend,
      metrikaTraffic,
      directRevenue,
      directRoas,
      attributionRevenue: sourceStats.reduce((sum, item) => sum + item.revenue, 0),
      note:
        "Аналитика связывает заказы с UTM/yclid/gclid/referrer, расходы Direct берет из Reports API, визиты и цели - из Метрики. Если интеграции не подключены, показываем честно: нет данных.",
    },
  });
}
