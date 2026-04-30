export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./orders-client";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      guestName: true,
      guestPhone: true,
      deliveryAddress: true,
      createdAt: true,
      totalAmount: true,
      deliveryCost: true,
      status: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      gclid: true,
      yclid: true,
      referrer: true,
      items: { select: { id: true } },
    },
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
  const clientOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt.toISOString(),
    totalAmount: order.totalAmount.toString(),
    deliveryCost: order.deliveryCost?.toString() ?? null,
    status: order.status,
    utmSource: order.utmSource,
    utmMedium: order.utmMedium,
    utmCampaign: order.utmCampaign,
    gclid: order.gclid,
    yclid: order.yclid,
    referrer: order.referrer,
    items: order.items,
  }));

  return (
    <div className="space-y-6">
      <OrdersClient orders={clientOrders} stats={stats} />
    </div>
  );
}
