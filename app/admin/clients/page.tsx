export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientsList } from "./clients-list";

export default async function ClientsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/admin");

  const clients = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
      orders: {
        where: { deletedAt: null },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          deliveryCost: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const totalClients = clients.length;
  const totalRevenue = clients.reduce((sum, c) => {
    return sum + c.orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryCost ?? 0), 0);
  }, 0);
  const withOrders = clients.filter((c) => c.orders.length > 0).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Клиенты</h1>
        <p className="text-muted-foreground mt-1">
          Зарегистрированные пользователи сайта — профили, заказы, история
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{totalClients}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Всего клиентов</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{withOrders}</p>
          <p className="text-xs text-muted-foreground mt-0.5">С заказами</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{totalRevenue.toLocaleString("ru-RU")} ₽</p>
          <p className="text-xs text-muted-foreground mt-0.5">Выручка от клиентов</p>
        </div>
      </div>

      <ClientsList clients={clients as any} />
    </div>
  );
}
