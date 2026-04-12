export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"];

export async function GET() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const now = new Date();

  // Build last 30 days slots (day-by-day)
  const days30: { label: string; revenue: number; orders: number; date: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days30.push({
      label: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      date: d.toISOString(),
      revenue: 0,
      orders: 0,
    });
  }

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    orders30,
    topProducts,
    statusCounts,
    clientStats,
    paymentStats,
    contactStats,
  ] = await Promise.all([
    // Raw orders for the chart
    prisma.order.findMany({
      where: { createdAt: { gte: since30 }, deletedAt: null },
      select: { createdAt: true, totalAmount: true, status: true },
    }),

    // Top-8 products by total revenue
    prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { price: true },
      _count: { _all: true },
      orderBy: { _sum: { price: "desc" } },
      take: 8,
    }),

    // Orders by status (all time, not deleted)
    prisma.order.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),

    // Repeat clients (phone appears more than once)
    prisma.order.groupBy({
      by: ["guestPhone"],
      where: { deletedAt: null, guestPhone: { not: null } },
      _count: { _all: true },
      having: { guestPhone: { _count: { gt: 1 } } },
    }),

    // Orders by payment method
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),

    // Orders by contact method (WhatsApp / Telegram / Телефон / SMS)
    prisma.order.groupBy({
      by: ["contactMethod"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  // Fill daily chart slots
  for (const order of orders30) {
    const d = new Date(order.createdAt);
    d.setHours(0, 0, 0, 0);
    const slot = days30.find(s => new Date(s.date).getTime() === d.getTime());
    if (slot) {
      slot.revenue += Number(order.totalAmount);
      slot.orders += 1;
    }
  }

  const totalRevenue30 = days30.reduce((s, d) => s + d.revenue, 0);
  const totalOrders30 = days30.reduce((s, d) => s + d.orders, 0);
  const avgOrder = totalOrders30 > 0 ? totalRevenue30 / totalOrders30 : 0;
  const repeatClients = clientStats.length;

  return NextResponse.json({
    chart: days30,
    totalRevenue30,
    totalOrders30,
    avgOrder,
    repeatClients,
    topProducts: topProducts.map(p => ({
      name: p.productName,
      revenue: Number(p._sum.price ?? 0),
      count: p._count._all,
    })),
    statusCounts: statusCounts.map(s => ({
      status: s.status,
      count: s._count._all,
    })),
    paymentStats: paymentStats.map(p => ({
      method: p.paymentMethod || "Не указан",
      count: p._count._all,
    })),
    contactStats: contactStats.map(c => ({
      method: c.contactMethod || "Не указан",
      count: c._count._all,
    })),
  });
}
