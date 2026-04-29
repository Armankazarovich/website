export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Phone, Trash2 } from "lucide-react";
import { OrdersClient } from "./orders-client";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
  const stats = {
    todayCount: todayOrders.filter((o) => o.status !== "CANCELLED").length,
    todayRevenue: todayOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.totalAmount) + Number(o.deliveryCost ?? 0), 0),
    newCount: orders.filter((o) => o.status === "NEW").length,
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
        <h1 className="font-display font-bold text-2xl min-w-0">Заказы</h1>
        <div className="flex items-center justify-end gap-2 flex-wrap min-w-0 max-w-full">
          <Link
            href="/admin/orders/trash"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-primary/[0.07] transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Корзина
          </Link>
          <Link
            href="/admin/orders/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-semibold max-w-full"
          >
            <Phone className="w-4 h-4" />
            <span className="truncate">Заказ по телефону</span>
          </Link>
        </div>
      </div>
      <OrdersClient orders={orders as any} stats={stats} />
    </div>
  );
}
