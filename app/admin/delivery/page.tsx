export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Truck, Phone, MapPin, Package, ArrowRight, Calculator } from "lucide-react";
import { DeliveryStatusSelect } from "./delivery-status-select";

const DELIVERY_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP"];

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отгружен",
  IN_DELIVERY: "Доставляется",
  READY_PICKUP: "Готов к выдаче",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PROCESSING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  SHIPPED: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  IN_DELIVERY: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  READY_PICKUP: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export default async function DeliveryPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !role || role === "USER") redirect("/login");

  const orders = await prisma.order.findMany({
    where: { status: { in: DELIVERY_STATUSES as any }, deletedAt: null },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped: Record<string, typeof orders> = {};
  for (const s of DELIVERY_STATUSES) {
    grouped[s] = orders.filter((o) => o.status === s);
  }

  const totalDelivery = orders.reduce((sum, o) => sum + Number((o as any).deliveryCost ?? 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display font-bold text-2xl flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          Доставка
        </h1>
        <div className="flex gap-3 text-sm">
          <Link
            href="/admin/delivery/rates"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted/50 transition-colors"
          >
            <Calculator className="w-4 h-4" />
            Тарифы и калькулятор
          </Link>
          <div className="px-4 py-2 bg-card border border-border rounded-xl">
            <span className="text-muted-foreground">Активных заказов:</span>{" "}
            <strong>{orders.length}</strong>
          </div>
          {totalDelivery > 0 && (
            <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
              <strong>Доставка: {totalDelivery.toLocaleString("ru-RU")} ₽</strong>
            </div>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Нет активных доставок</p>
        </div>
      ) : (
        DELIVERY_STATUSES.filter((s) => grouped[s].length > 0).map((status) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[status]}`}>
                {STATUS_LABELS[status]}
              </span>
              <span className="text-sm text-muted-foreground">{grouped[status].length} заказов</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped[status].map((order) => {
                const deliveryCost = Number((order as any).deliveryCost ?? 0);
                return (
                  <div key={order.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">Заказ #{order.orderNumber}</p>
                        <p className="text-sm font-medium mt-0.5">{order.guestName || "Клиент"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</p>
                        {deliveryCost > 0 && (
                          <p className="text-xs text-muted-foreground">доставка: {deliveryCost.toLocaleString("ru-RU")} ₽</p>
                        )}
                      </div>
                    </div>

                    {order.guestPhone && (
                      <a
                        href={`tel:${order.guestPhone}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {order.guestPhone}
                      </a>
                    )}

                    {order.deliveryAddress && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{order.deliveryAddress}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Package className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        {order.items.map((i) =>
                          `${i.productName} ${i.variantSize} × ${Number(i.quantity)} ${i.unitType === "CUBE" ? "м³" : "шт"}`
                        ).join(", ")}
                      </span>
                    </div>

                    {order.comment && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        💬 {order.comment}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-border">
                      <DeliveryStatusSelect orderId={order.id} currentStatus={order.status} />
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Открыть <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
