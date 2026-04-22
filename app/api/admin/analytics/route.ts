export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { classifySource, humanizeSource, type SourceGroup } from "@/lib/utm";

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
    ordersAttribution30,
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

    // UTM attribution — last 30 days (source classification done in JS)
    prisma.order.findMany({
      where: { createdAt: { gte: since30 }, deletedAt: null },
      select: {
        totalAmount: true,
        deliveryCost: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        gclid: true,
        yclid: true,
        referrer: true,
      },
    }),
  ]);

  // Aggregate sources (last 30 days)
  const sourceAgg: Record<SourceGroup, { count: number; revenue: number }> = {
    direct_ad: { count: 0, revenue: 0 },
    google_ads: { count: 0, revenue: 0 },
    organic: { count: 0, revenue: 0 },
    social: { count: 0, revenue: 0 },
    referral: { count: 0, revenue: 0 },
    direct: { count: 0, revenue: 0 },
    other: { count: 0, revenue: 0 },
  };
  const campaignAgg: Record<string, { count: number; revenue: number; group: SourceGroup }> = {};
  for (const o of ordersAttribution30) {
    const group = classifySource(o);
    const value = Number(o.totalAmount ?? 0) + Number(o.deliveryCost ?? 0);
    sourceAgg[group].count += 1;
    sourceAgg[group].revenue += value;
    if (o.utmCampaign) {
      const key = o.utmCampaign;
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
    .map(([campaign, v]) => ({
      campaign,
      group: v.group,
      label: humanizeSource(v.group).label,
      count: v.count,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, 10);

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
    sourceStats,
    campaignStats,
  });
}
