export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { classifySource, humanizeSource, type SourceGroup } from "@/lib/utm";
import { getYandexDirectSpendSummary } from "@/lib/yandex-direct";
import { getYandexMetrikaTrafficSummary } from "@/lib/yandex-metrika";

async function requireFinanceAccess() {
  const auth = await requireRole("SUPER_ADMIN", "ADMIN", "ACCOUNTANT");
  if (!auth.authorized) return auth.response;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "finance.wallet-ledger",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess.response;

  return null;
}

function parseDateBoundary(
  value: string | null,
  fallback: Date,
  boundary: "start" | "end",
) {
  if (!value) return fallback;

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        boundary === "start" ? 0 : 23,
        boundary === "start" ? 0 : 59,
        boundary === "start" ? 0 : 59,
        boundary === "start" ? 0 : 999,
      )
    : new Date(value);

  if (Number.isNaN(parsed.getTime())) return null;
  if (!dateOnly && boundary === "end") parsed.setHours(23, 59, 59, 999);
  if (!dateOnly && boundary === "start") parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function moneyValue(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function periodDays(from: Date, to: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((to.getTime() - from.getTime() + 1) / dayMs));
}

function initDailyMap(from: Date, to: Date) {
  const result: Record<string, number> = {};
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    result[dayKey(cursor)] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function buildReadiness({
  ordersCount,
  expensesCount,
  directReady,
  directError,
  metrikaReady,
  metrikaError,
  attributedOrders,
}: {
  ordersCount: number;
  expensesCount: number;
  directReady: boolean;
  directError: string | null | undefined;
  metrikaReady: boolean;
  metrikaError: string | null | undefined;
  attributedOrders: number;
}) {
  const items = [
    {
      key: "orders",
      label: "Заказы",
      status: ordersCount > 0 ? "ready" : "attention",
      text:
        ordersCount > 0
          ? `${ordersCount} заказов попали в финансовый период.`
          : "Заказов в периоде нет. Финансы готовы, но считать пока нечего.",
    },
    {
      key: "expenses",
      label: "Расходы",
      status: expensesCount > 0 ? "ready" : "attention",
      text:
        expensesCount > 0
          ? `${expensesCount} ручных расходов учтено.`
          : "Расходы не внесены. Добавьте аренду, закупки, зарплаты и рекламу.",
    },
    {
      key: "direct",
      label: "Direct",
      status: directReady ? "ready" : "attention",
      text: directReady
        ? "Расходы Direct подтягиваются из Reports API."
        : directError || "Direct не подключен. Реклама считается только вручную.",
    },
    {
      key: "metrika",
      label: "Метрика",
      status: metrikaReady ? "ready" : "attention",
      text: metrikaReady
        ? "Метрика подтягивает визиты, цели и аудиторию."
        : metrikaError || "Метрика не подключена. Путь клиента пока неполный.",
    },
    {
      key: "attribution",
      label: "Атрибуция",
      status: attributedOrders > 0 ? "ready" : "attention",
      text:
        attributedOrders > 0
          ? `${attributedOrders} заказов связаны с UTM, yclid, gclid или referrer.`
          : "Новые рекламные заказы должны приходить с UTM/yclid для ROAS.",
    },
    {
      key: "bank",
      label: "Банк",
      status: "planned",
      text: "Банк пока не подключен. Это управленческий учет, не банковский остаток.",
    },
  ] as const;

  const readyCount = items.filter((item) => item.status === "ready").length;
  return {
    score: Math.round((readyCount / items.length) * 100),
    items,
  };
}

function buildRecommendations({
  ordersCount,
  expensesCount,
  grossProfit,
  expenseRatio,
  directRoas,
  directSpend,
  directRevenue,
  metrikaGoals,
  attributedOrders,
}: {
  ordersCount: number;
  expensesCount: number;
  grossProfit: number;
  expenseRatio: number;
  directRoas: number | null;
  directSpend: number;
  directRevenue: number;
  metrikaGoals: number;
  attributedOrders: number;
}) {
  const items: string[] = [];

  if (ordersCount === 0) {
    items.push("Нет заказов за период: проверьте терминал, заявки и путь оформления.");
  }
  if (expensesCount === 0) {
    items.push("Добавьте основные расходы, иначе прибыль будет выглядеть лучше реальности.");
  }
  if (grossProfit < 0) {
    items.push("Прибыль отрицательная: проверьте крупные расходы, цены и отмененные заказы.");
  }
  if (expenseRatio > 60) {
    items.push("Расходы выше 60% выручки: нужен контроль закупок, аренды и рекламы.");
  }
  if (directSpend > 0 && directRoas != null && directRoas < 1) {
    items.push("Direct тратит больше, чем возвращает по меткам: проверьте кампании и цели.");
  }
  if (directSpend > 0 && directRevenue === 0) {
    items.push("Есть расход Direct, но нет выручки по Direct-меткам: проверьте UTM/yclid.");
  }
  if (metrikaGoals === 0) {
    items.push("Цели Метрики не дают конверсии: после настройки целей финансы станут точнее.");
  }
  if (attributedOrders === 0 && ordersCount > 0) {
    items.push("Заказы есть, но без источников: включите метки для рекламы и рассылок.");
  }

  if (items.length === 0) {
    items.push("Финансовый контур выглядит ровно: продолжайте сверять расходы и рекламу каждую неделю.");
  }

  return items.slice(0, 5);
}

// GET /api/admin/finance?from=2024-01-01&to=2024-12-31
export async function GET(req: Request) {
  const denied = await requireFinanceAccess();
  if (denied) return denied;

  const tenantId = getCurrentTenantId();
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const from = parseDateBoundary(
    fromParam,
    new Date(now.getFullYear(), now.getMonth(), 1),
    "start",
  );
  const to = parseDateBoundary(
    toParam,
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    "end",
  );

  if (!from || !to || from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const daysInPeriod = periodDays(from, to);
  const periodLength = to.getTime() - from.getTime() + 1;
  const prevFrom = new Date(from.getTime() - periodLength);
  const prevTo = new Date(from.getTime() - 1);

  const [orders, expenses, previousOrders, previousExpenses, settingsRows] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: ["CANCELLED"] },
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          totalAmount: true,
          deliveryCost: true,
          status: true,
          createdAt: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          gclid: true,
          yclid: true,
          referrer: true,
        },
      }),

      prisma.expense.findMany({
        where: { tenantId, date: { gte: from, lte: to } },
        orderBy: { date: "desc" },
      }),

      prisma.order.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: ["CANCELLED"] },
          createdAt: { gte: prevFrom, lte: prevTo },
        },
        select: { totalAmount: true, status: true },
      }),

      prisma.expense.findMany({
        where: { tenantId, date: { gte: prevFrom, lte: prevTo } },
        select: { amount: true },
      }),

      prisma.siteSettings.findMany({ where: { tenantId } }),
    ]);

  const orderTotal = (order: { totalAmount: unknown }) =>
    moneyValue(order.totalAmount);
  const revenue = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const deliveryRevenue = orders.reduce(
    (sum, order) => sum + moneyValue(order.deliveryCost),
    0,
  );
  const productRevenue = Math.max(revenue - deliveryRevenue, 0);
  const completedOrders = orders.filter((order) =>
    ["COMPLETED", "DELIVERED"].includes(order.status),
  );
  const completedRevenue = completedOrders.reduce(
    (sum, order) => sum + orderTotal(order),
    0,
  );
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + moneyValue(expense.amount),
    0,
  );
  const grossProfit = revenue - totalExpenses;

  const vatRate = 0.2;
  const vatAmount = (revenue * vatRate) / (1 + vatRate);
  const profitAfterVat = grossProfit - vatAmount;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (profitAfterVat / revenue) * 100 : 0;
  const expenseRatio = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;
  const averageOrderValue = orders.length > 0 ? revenue / orders.length : 0;
  const averageDailyRevenue = revenue / daysInPeriod;
  const breakEvenDaily = totalExpenses / daysInPeriod;
  const pendingReceivables = Math.max(revenue - completedRevenue, 0);
  const completedNet = completedRevenue - totalExpenses;

  const expensesByCategory: Record<string, number> = {};
  for (const expense of expenses) {
    expensesByCategory[expense.category] =
      (expensesByCategory[expense.category] || 0) + moneyValue(expense.amount);
  }

  const revenueByDay = initDailyMap(from, to);
  const expensesByDay = initDailyMap(from, to);
  for (const order of orders) {
    const key = dayKey(order.createdAt);
    revenueByDay[key] = (revenueByDay[key] || 0) + orderTotal(order);
  }
  for (const expense of expenses) {
    const key = dayKey(expense.date);
    expensesByDay[key] = (expensesByDay[key] || 0) + moneyValue(expense.amount);
  }

  const sourceAgg: Record<SourceGroup, { orders: number; revenue: number }> = {
    direct_ad: { orders: 0, revenue: 0 },
    google_ads: { orders: 0, revenue: 0 },
    organic: { orders: 0, revenue: 0 },
    social: { orders: 0, revenue: 0 },
    referral: { orders: 0, revenue: 0 },
    direct: { orders: 0, revenue: 0 },
    other: { orders: 0, revenue: 0 },
  };

  let attributedOrders = 0;
  for (const order of orders) {
    const group = classifySource(order);
    const value = orderTotal(order);
    sourceAgg[group].orders += 1;
    sourceAgg[group].revenue += value;
    if (
      order.utmSource ||
      order.utmMedium ||
      order.utmCampaign ||
      order.gclid ||
      order.yclid ||
      order.referrer
    ) {
      attributedOrders += 1;
    }
  }

  const sourceStats = (Object.keys(sourceAgg) as SourceGroup[])
    .map((group) => ({
      group,
      label: humanizeSource(group).label,
      orders: sourceAgg[group].orders,
      revenue: sourceAgg[group].revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

  const manualAdvertisingExpenses = expenses
    .filter((expense) => expense.category.toLowerCase().includes("реклама"))
    .reduce((sum, expense) => sum + moneyValue(expense.amount), 0);

  const settings = Object.fromEntries(
    settingsRows.map((row) => [row.key, row.value]),
  );
  const [directSpend, metrikaTraffic] = await Promise.all([
    getYandexDirectSpendSummary({ settings, from, to }),
    getYandexMetrikaTrafficSummary({ settings, from, to }),
  ]);
  const directRevenue = sourceAgg.direct_ad.revenue;
  const directRoas =
    directSpend.spend > 0 ? directRevenue / directSpend.spend : null;
  const manualAdsRoas =
    manualAdvertisingExpenses > 0
      ? (directRevenue + sourceAgg.google_ads.revenue) / manualAdvertisingExpenses
      : null;

  const previousRevenue = previousOrders.reduce(
    (sum, order) => sum + orderTotal(order),
    0,
  );
  const previousCompletedRevenue = previousOrders
    .filter((order) => ["COMPLETED", "DELIVERED"].includes(order.status))
    .reduce((sum, order) => sum + orderTotal(order), 0);
  const previousExpenseTotal = previousExpenses.reduce(
    (sum, expense) => sum + moneyValue(expense.amount),
    0,
  );
  const previousGrossProfit = previousRevenue - previousExpenseTotal;
  const previousVatAmount = (previousRevenue * vatRate) / (1 + vatRate);
  const previousProfitAfterVat = previousGrossProfit - previousVatAmount;

  const openFinanceTasks = await prisma.task.findMany({
    where: {
      tenantId,
      status: { not: "DONE" },
      OR: [
        { tags: { has: "finance" } },
        { tags: { has: "финансы" } },
        {
          relations: {
            some: { entityType: "BUSINESS", entityId: "finance" },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 5,
  });

  const latestMovementAt = [
    ...orders.map((order) => order.createdAt),
    ...expenses.map((expense) => expense.date),
  ].sort((a, b) => b.getTime() - a.getTime())[0];

  const readiness = buildReadiness({
    ordersCount: orders.length,
    expensesCount: expenses.length,
    directReady: directSpend.available,
    directError: directSpend.error,
    metrikaReady: metrikaTraffic.available,
    metrikaError: metrikaTraffic.error,
    attributedOrders,
  });
  const recommendations = buildRecommendations({
    ordersCount: orders.length,
    expensesCount: expenses.length,
    grossProfit,
    expenseRatio,
    directRoas,
    directSpend: directSpend.spend,
    directRevenue,
    metrikaGoals: metrikaTraffic.goalReaches,
    attributedOrders,
  });

  return NextResponse.json({
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      previousFrom: prevFrom.toISOString(),
      previousTo: prevTo.toISOString(),
      days: daysInPeriod,
      updatedAt: new Date().toISOString(),
    },
    revenue,
    productRevenue,
    deliveryRevenue,
    completedRevenue,
    ordersCount: orders.length,
    completedOrdersCount: completedOrders.length,
    averageOrderValue,
    totalExpenses,
    expensesByCategory,
    grossProfit,
    margin,
    vatRate,
    vatAmount,
    profitAfterVat,
    netMargin,
    expenseRatio,
    revenueGrowth: percentChange(revenue, previousRevenue),
    revenueByDay,
    expensesByDay,
    expenses,
    comparison: {
      previousRevenue,
      previousCompletedRevenue,
      previousExpenses: previousExpenseTotal,
      previousGrossProfit,
      previousProfitAfterVat,
      revenueDeltaPct: percentChange(revenue, previousRevenue),
      expensesDeltaPct: percentChange(totalExpenses, previousExpenseTotal),
      grossProfitDeltaPct: percentChange(grossProfit, previousGrossProfit),
      profitAfterVatDeltaPct: percentChange(
        profitAfterVat,
        previousProfitAfterVat,
      ),
    },
    cashflow: {
      inflow: revenue,
      completedInflow: completedRevenue,
      outflow: totalExpenses,
      net: grossProfit,
      completedNet,
      pendingReceivables,
      averageDailyRevenue,
      breakEvenDaily,
      safeToSpend: Math.max(completedNet, 0),
    },
    readiness,
    recommendations,
    dataQuality: {
      ordersCount: orders.length,
      completedOrdersCount: completedOrders.length,
      expensesCount: expenses.length,
      attributedOrders,
      directConnected: directSpend.available,
      metrikaConnected: metrikaTraffic.available,
      bankConnected: false,
      revenueIncludesDelivery: true,
      source: "orders_totalAmount_and_manual_expenses",
    },
    marketing: {
      sourceStats,
      manualAdvertisingExpenses,
      directRevenue,
      directSpend,
      metrikaTraffic,
      directRoas,
      manualAdsRoas,
      note:
        "Выручка берется из totalAmount заказа, где доставка уже включена. Расход Direct берется из Reports API при OAuth; ручная категория Реклама остается для сверки и других каналов.",
    },
    foundation: {
      wallet: {
        status: "read-only",
        source: "Заказы без отмененных статусов + ручные расходы",
        displayBalance: grossProfit,
        completedBalance: completedNet,
        note:
          "Это управленческий расчет по существующим данным, не банковский остаток и не платежное поручение.",
      },
      piloPoints: {
        status: "planned",
        ledgerReady: false,
        balance: null,
        source: "Таблиц начисления баллов пока нет",
        note:
          "Внутреннюю монету ПилоРус можно включать только после правил начисления, списания и аудита.",
      },
      movements: {
        status: "read-only",
        incomeCount: orders.length,
        expenseCount: expenses.length,
        totalCount: orders.length + expenses.length,
        latestAt: latestMovementAt?.toISOString() ?? null,
        source: "Заказы и ручной журнал расходов",
      },
      taskOps: {
        status: "ready",
        openCount: openFinanceTasks.length,
        relation: { entityType: "BUSINESS", entityId: "finance" },
        tasks: openFinanceTasks.map((task) => ({
          ...task,
          dueDate: task.dueDate?.toISOString() ?? null,
          createdAt: task.createdAt.toISOString(),
        })),
      },
    },
  });
}
