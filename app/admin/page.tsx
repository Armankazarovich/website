export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import { ShoppingBag, Package, Star, TrendingUp, Clock, Users, BarChart3, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days7ago = new Date(now); days7ago.setDate(days7ago.getDate() - 6); days7ago.setHours(0, 0, 0, 0);
  const days30ago = new Date(now); days30ago.setDate(days30ago.getDate() - 29); days30ago.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    newOrders,
    todayOrders,
    totalProducts,
    pendingReviews,
    recentOrders,
    revenue30,
    revenue7,
    revenueToday,
    allOrdersForChart,
    topItems,
    statusCounts,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.product.count({ where: { active: true } }),
    prisma.review.count({ where: { approved: false } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, orderNumber: true, guestName: true, totalAmount: true, status: true, createdAt: true, items: { select: { id: true } } },
    }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days7ago } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: today } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: days7ago }, status: { not: "CANCELLED" } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { price: true },
      _count: { id: true },
      orderBy: { _sum: { price: "desc" } },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  // Build 7-day chart data
  const chartDays: { label: string; amount: number; date: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    chartDays.push({ label: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }), amount: 0, date: d });
  }
  for (const o of allOrdersForChart) {
    const d = new Date(o.createdAt); d.setHours(0, 0, 0, 0);
    const slot = chartDays.find(c => c.date.getTime() === d.getTime());
    if (slot) slot.amount += Number(o.totalAmount);
  }
  const maxAmount = Math.max(...chartDays.map(d => d.amount), 1);

  // Status breakdown
  const statusMap: Record<string, number> = {};
  for (const s of statusCounts) statusMap[s.status] = s._count.id;
  const statusOrder = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP", "DELIVERED", "CANCELLED"];
  const statusData = statusOrder.map(s => ({ status: s, count: statusMap[s] || 0 })).filter(s => s.count > 0);

  // Average order value (30 days)
  const orders30count = await prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago } } });
  const avgOrder = orders30count > 0 ? Number(revenue30._sum.totalAmount || 0) / orders30count : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Дашборд</h1>
        <p className="text-sm text-muted-foreground">{now.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Выручка за 30 дн.", value: formatPrice(Number(revenue30._sum.totalAmount || 0)), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "Выручка сегодня", value: formatPrice(Number(revenueToday._sum.totalAmount || 0)), icon: BarChart3, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
          { label: "Средний чек", value: formatPrice(avgOrder), icon: ArrowUpRight, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
          { label: "Новых заказов", value: newOrders, icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-display font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <ShoppingBag className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold">{totalOrders}</p>
          <p className="text-xs text-muted-foreground">Всего заказов</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold">{todayOrders}</p>
          <p className="text-xs text-muted-foreground">Заказов сегодня</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Package className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold">{totalProducts}</p>
          <p className="text-xs text-muted-foreground">Активных товаров</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart (7 days) */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-sm mb-4">Выручка за 7 дней</h2>
          <div className="flex items-end gap-1.5 h-28">
            {chartDays.map((d) => {
              const pct = maxAmount > 0 ? Math.max((d.amount / maxAmount) * 100, d.amount > 0 ? 5 : 0) : 0;
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-md transition-colors cursor-default"
                      style={{ height: `${pct}%`, minHeight: d.amount > 0 ? "4px" : "0" }}
                      title={formatPrice(d.amount)}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
            <span>7 дней: <strong className="text-foreground">{formatPrice(Number(revenue7._sum.totalAmount || 0))}</strong></span>
            <span>30 дней: <strong className="text-foreground">{formatPrice(Number(revenue30._sum.totalAmount || 0))}</strong></span>
          </div>
        </div>

        {/* Order statuses breakdown */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-sm mb-4">Статусы заказов</h2>
          <div className="space-y-2">
            {statusData.slice(0, 6).map(({ status, count }) => {
              const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
              const colorClass = ORDER_STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
              const label = ORDER_STATUS_LABELS[status] || status;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {statusData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Топ товаров (выручка)</h2>
          </div>
          <div className="divide-y divide-border">
            {topItems.map((item, i) => (
              <div key={item.productName} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <p className="flex-1 text-sm font-medium truncate">{item.productName}</p>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatPrice(Number(item._sum.price || 0))}</p>
                  <p className="text-xs text-muted-foreground">{item._count.id} позиций</p>
                </div>
              </div>
            ))}
            {topItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Нет данных</p>}
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Последние заказы</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">Все →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => {
              const color = ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800";
              const label = ORDER_STATUS_LABELS[order.status] || order.status;
              return (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">#{order.orderNumber} · {order.guestName || "Клиент"}</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>
                  </div>
                  <p className="text-sm font-bold shrink-0">{formatPrice(Number(order.totalAmount))}</p>
                </Link>
              );
            })}
            {recentOrders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Заказов ещё нет</p>}
          </div>
        </div>
      </div>

      {pendingReviews > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm font-medium">{pendingReviews} отзыв(ов) ожидают модерации</p>
          </div>
          <Link href="/admin/reviews" className="text-sm text-primary font-medium hover:underline shrink-0">Модерировать →</Link>
        </div>
      )}
    </div>
  );
}
