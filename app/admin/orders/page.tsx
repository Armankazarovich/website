export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Phone } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Заказы</h1>
        <Link
          href="/admin/orders/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-semibold"
        >
          <Phone className="w-4 h-4" />
          Заказ по телефону
        </Link>
      </div>
      <OrdersClient orders={orders as any} stats={stats} />
    </div>
  );
}
