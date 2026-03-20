export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag, Package, Star, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [
    totalOrders,
    newOrders,
    totalProducts,
    pendingReviews,
    recentOrders,
    revenue,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.product.count({ where: { active: true } }),
    prisma.review.count({ where: { approved: false } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: true },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: "CANCELLED" } },
    }),
  ]);

  const stats = [
    { label: "Всего заказов", value: totalOrders, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Новых заказов", value: newOrders, icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
    { label: "Товаров", value: totalProducts, icon: Package, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    {
      label: "Выручка",
      value: formatPrice(Number(revenue._sum.totalAmount || 0)),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/5",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Дашборд</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-semibold text-lg">Последние заказы</h2>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">
            Все заказы →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">Заказ #{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {order.guestName || "Клиент"} · {order.items.length} позиций
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatPrice(Number(order.totalAmount))}</p>
                <span className="text-xs text-muted-foreground">{order.status}</span>
              </div>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Заказов ещё нет</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      {pendingReviews > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium">
              {pendingReviews} отзив(ов) ожидают модерации
            </p>
          </div>
          <Link href="/admin/reviews" className="text-sm text-primary font-medium hover:underline">
            Модерировать →
          </Link>
        </div>
      )}
    </div>
  );
}
