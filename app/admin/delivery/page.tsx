export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Truck, Phone, MapPin, Package, ArrowRight, Calculator, FileDown, Archive, Store, MessageSquare } from "lucide-react";
import { DeliveryStatusSelect } from "./delivery-status-select";
import { AutoRefresh } from "@/components/admin/auto-refresh";

const ACTIVE_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY"];
const PICKUP_STATUS = "READY_PICKUP";
const ARCHIVE_STATUSES = ["DELIVERED", "COMPLETED", "CANCELLED"];

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отгружен",
  IN_DELIVERY: "Доставляется",
  READY_PICKUP: "Готов к выдаче",
  DELIVERED: "Доставлен",
  COMPLETED: "Завершён (самовывоз)",
  CANCELLED: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-primary/10 text-primary",
  PROCESSING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  SHIPPED: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  IN_DELIVERY: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  READY_PICKUP: "bg-green-500/10 text-green-700 dark:text-green-400",
  DELIVERED: "bg-muted text-muted-foreground",
  COMPLETED: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export default async function DeliveryPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !role || role === "USER") redirect("/login");

  const allOrders = await prisma.order.findMany({
    where: {
      status: { in: [...ACTIVE_STATUSES, PICKUP_STATUS, ...ARCHIVE_STATUSES] as any },
      deletedAt: null,
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const activeOrders = allOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const pickupOrders = allOrders.filter((o) => o.status === PICKUP_STATUS);
  const archiveOrders = allOrders.filter((o) => ARCHIVE_STATUSES.includes(o.status));

  const totalDelivery = [...activeOrders, ...pickupOrders].reduce(
    (sum, o) => sum + Number((o as any).deliveryCost ?? 0),
    0
  );

  const grouped: Record<string, typeof allOrders> = {};
  for (const s of ACTIVE_STATUSES) {
    grouped[s] = activeOrders.filter((o) => o.status === s);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Автообновление каждые 30 секунд */}
      <AutoRefresh intervalMs={30000} />
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display font-bold text-2xl flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          Доставка
        </h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/admin/delivery/rates"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted/50 transition-colors"
          >
            <Calculator className="w-4 h-4" />
            Тарифы и калькулятор
          </Link>
          <div className="px-4 py-2 bg-card border border-border rounded-xl">
            <span className="text-muted-foreground">Активных:</span>{" "}
            <strong>{activeOrders.length + pickupOrders.length}</strong>
          </div>
          {totalDelivery > 0 && (
            <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
              <strong>Доставка: {totalDelivery.toLocaleString("ru-RU")} ₽</strong>
            </div>
          )}
        </div>
      </div>

      {/* Active delivery orders */}
      {activeOrders.length === 0 && pickupOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Нет активных доставок</p>
        </div>
      ) : (
        <>
          {ACTIVE_STATUSES.filter((s) => grouped[s]?.length > 0).map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-sm text-muted-foreground">{grouped[status].length} заказов</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[status].map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          ))}

          {/* Self-pickup section */}
          {pickupOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit ${STATUS_COLORS[PICKUP_STATUS]}`}>
                  <Store className="w-3.5 h-3.5" />
                  Самовывоз — Готов к выдаче
                </span>
                <span className="text-sm text-muted-foreground">{pickupOrders.length} заказов</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pickupOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Archive */}
      {archiveOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Архив</span>
            <span className="text-sm text-muted-foreground">({archiveOrders.length})</span>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Заказ</th>
                  <th className="text-left px-4 py-3 font-semibold">Клиент</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Адрес</th>
                  <th className="text-right px-4 py-3 font-semibold">Сумма</th>
                  <th className="text-center px-4 py-3 font-semibold">Статус</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {archiveOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">#{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.guestName || "—"}</p>
                      {order.guestPhone && (
                        <a href={`tel:${order.guestPhone}`} className="text-xs text-primary hover:underline">{order.guestPhone}</a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell max-w-[180px] truncate">
                      {order.deliveryAddress || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {Number(order.totalAmount).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const deliveryCost = Number(order.deliveryCost ?? 0);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
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
          {order.items.map((i: any) =>
            `${i.productName} ${i.variantSize} × ${Number(i.quantity)} ${i.unitType === "CUBE" ? "м³" : "шт"}`
          ).join(", ")}
        </span>
      </div>

      {order.comment && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 flex items-start gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {order.comment}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <DeliveryStatusSelect orderId={order.id} currentStatus={order.status} />
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/orders/${order.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            title="Скачать счёт PDF"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hover:bg-muted/50 rounded-lg"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </a>
          <Link
            href={`/admin/orders/${order.id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Открыть <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
