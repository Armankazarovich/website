export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAuth() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "ACCOUNTANT" || role === "MANAGER";
}

// GET /api/admin/finance?from=2024-01-01&to=2024-12-31
export async function GET(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toParam ? new Date(toParam) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Revenue from non-cancelled orders
  const orders = await prisma.order.findMany({
    where: {
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
    0
  );

  // Completed orders revenue (for more accurate P&L)
  const completedRevenue = orders
    .filter((o) => ["COMPLETED", "DELIVERED"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.totalAmount) + Number(o.deliveryCost ?? 0), 0);

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: "desc" },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Expenses by category
  const expensesByCategory: Record<string, number> = {};
  for (const e of expenses) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
  }

  // НДС (20%) — сколько НДС включено в выручку (если работает с НДС)
  const vatRate = 0.2;
  const vatAmount = revenue * vatRate / (1 + vatRate); // выделяем НДС из суммы с НДС

  // P&L
  const grossProfit = revenue - totalExpenses;
  const profitAfterVat = grossProfit - vatAmount;

  // Monthly breakdown (revenue by day)
  const revenueByDay: Record<string, number> = {};
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.totalAmount) + Number(o.deliveryCost ?? 0);
  }

  // Orders count stats
  const ordersCount = orders.length;

  // Previous period for comparison
  const periodLength = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodLength);
  const prevTo = new Date(from.getTime() - 1);
  const prevOrders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["CANCELLED"] },
      createdAt: { gte: prevFrom, lte: prevTo },
    },
    select: { totalAmount: true, deliveryCost: true },
  });
  const prevRevenue = prevOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount) + Number(o.deliveryCost ?? 0),
    0
  );
  const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

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
  });
}
