export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

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

  // Revenue from non-cancelled orders
  const orders = await prisma.order.findMany({
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
    },
  });

  const revenue = orders.reduce(
    (sum, o) => sum + Number(o.totalAmount) + Number(o.deliveryCost ?? 0),
    0,
  );

  // Completed orders revenue (for more accurate P&L)
  const completedRevenue = orders
    .filter((o) => ["COMPLETED", "DELIVERED"].includes(o.status))
    .reduce(
      (sum, o) => sum + Number(o.totalAmount) + Number(o.deliveryCost ?? 0),
      0,
    );

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { tenantId, date: { gte: from, lte: to } },
    orderBy: { date: "desc" },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Expenses by category
  const expensesByCategory: Record<string, number> = {};
  for (const e of expenses) {
    expensesByCategory[e.category] =
      (expensesByCategory[e.category] || 0) + Number(e.amount);
  }

  // НДС (20%) — сколько НДС включено в выручку (если работает с НДС)
  const vatRate = 0.2;
  const vatAmount = (revenue * vatRate) / (1 + vatRate); // выделяем НДС из суммы с НДС

  // P&L
  const grossProfit = revenue - totalExpenses;
  const profitAfterVat = grossProfit - vatAmount;

  // Monthly breakdown (revenue by day)
  const revenueByDay: Record<string, number> = {};
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    revenueByDay[day] =
      (revenueByDay[day] || 0) +
      Number(o.totalAmount) +
      Number(o.deliveryCost ?? 0);
  }

  // Orders count stats
  const ordersCount = orders.length;

  // Previous period for comparison
  const periodLength = to.getTime() - from.getTime() + 1;
  const prevFrom = new Date(from.getTime() - periodLength);
  const prevTo = new Date(from.getTime() - 1);
  const prevOrders = await prisma.order.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { notIn: ["CANCELLED"] },
      createdAt: { gte: prevFrom, lte: prevTo },
    },
    select: { totalAmount: true, deliveryCost: true },
  });
  const prevRevenue = prevOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount) + Number(o.deliveryCost ?? 0),
    0,
  );
  const revenueGrowth =
    prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

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

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    revenue,
    completedRevenue,
    ordersCount,
    totalExpenses,
    expensesByCategory,
    grossProfit,
    vatAmount,
    profitAfterVat,
    revenueGrowth,
    revenueByDay,
    expenses,
    foundation: {
      wallet: {
        status: "read-only",
        source: "Заказы без отмененных статусов + ручные расходы",
        displayBalance: grossProfit,
        completedBalance: completedRevenue - totalExpenses,
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
