export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./orders-client";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
  const stats = {
    todayCount: todayOrders.length,
    todayRevenue: todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    newCount: orders.filter((o) => o.status === "NEW").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Заказы</h1>
      <OrdersClient orders={orders as any} stats={stats} />
    </div>
  );
}
