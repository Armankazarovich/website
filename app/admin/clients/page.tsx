export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClientsList } from "./clients-list";
import { formatPrice } from "@/lib/utils";
import { getCurrentTenantId } from "@/lib/tenant-context";

export default async function ClientsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "MANAGER") redirect("/admin");
  const tenantId = getCurrentTenantId();

  const clients = await prisma.user.findMany({
    where: { tenantId, role: "USER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
      orders: {
        where: { tenantId, deletedAt: null },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          deliveryCost: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const orderStatsRows = await prisma.order.findMany({
    where: {
      tenantId,
      deletedAt: null,
      userId: { not: null },
    },
    select: {
      userId: true,
      totalAmount: true,
      deliveryCost: true,
      status: true,
    },
  });

  const orderStats = new Map<
    string,
    { orderCount: number; paidOrderCount: number; activeOrderCount: number; revenue: number }
  >();
  for (const order of orderStatsRows) {
    if (!order.userId) continue;
    const current =
      orderStats.get(order.userId) ??
      { orderCount: 0, paidOrderCount: 0, activeOrderCount: 0, revenue: 0 };
    current.orderCount += 1;
    if (order.status !== "CANCELLED") {
      current.paidOrderCount += 1;
      current.revenue += Number(order.totalAmount) + Number(order.deliveryCost ?? 0);
    }
    if (!["DELIVERED", "COMPLETED", "CANCELLED"].includes(order.status)) {
      current.activeOrderCount += 1;
    }
    orderStats.set(order.userId, current);
  }

  const clientRows = clients.map((client) => {
    const stats = orderStats.get(client.id);
    return {
      ...client,
      orderCount: stats?.orderCount ?? 0,
      paidOrderCount: stats?.paidOrderCount ?? 0,
      activeOrderCount: stats?.activeOrderCount ?? 0,
      revenue: stats?.revenue ?? 0,
      orders: client.orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        totalAmount: order.totalAmount.toString(),
        deliveryCost: order.deliveryCost?.toString() ?? null,
      })),
    };
  });

  const totalClients = clientRows.length;
  const totalRevenue = clientRows.reduce((sum, client) => sum + client.revenue, 0);
  const withOrders = clientRows.filter((client) => client.orderCount > 0).length;
  const repeatClients = clientRows.filter((client) => client.paidOrderCount >= 2).length;

  return (
    <div className="admin-page-frame admin-page-frame-fluid">
      <div>
        <h1 className="font-display text-2xl font-bold">Клиенты</h1>
        <p className="text-muted-foreground mt-1">
          База покупателей, сегменты, история заказов и рабочие действия.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">База</p>
          <p className="mt-4 text-2xl font-bold">{totalClients}</p>
          <p className="mt-1 text-xs text-muted-foreground">всего клиентов</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Покупали</p>
          <p className="mt-4 text-2xl font-bold">{withOrders}</p>
          <p className="mt-1 text-xs text-muted-foreground">есть хотя бы один заказ</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Повторные</p>
          <p className="mt-4 text-2xl font-bold">{repeatClients}</p>
          <p className="mt-1 text-xs text-muted-foreground">вернулись за покупкой</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Выручка</p>
          <p className="mt-4 text-2xl font-bold">{formatPrice(totalRevenue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">без отменённых заказов</p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card/80 p-8 text-sm text-muted-foreground">
            Загрузка клиентов...
          </div>
        }
      >
        <ClientsList clients={clientRows} canManageSensitiveActions={role === "SUPER_ADMIN" || role === "ADMIN"} />
      </Suspense>
    </div>
  );
}
