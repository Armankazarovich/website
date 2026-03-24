export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { ArrowLeft, Phone, Mail, MapPin, CreditCard, MessageSquare, Package } from "lucide-react";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!order) notFound();

  const statusColor = ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800";
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Шапка */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Заказы
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-display font-bold text-2xl">Заказ #{order.orderNumber}</h1>
        <span className={`ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Информация о клиенте */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Клиент</h2>
          <div className="space-y-2">
            <p className="font-semibold">{order.guestName || order.user?.name || "—"}</p>
            {(order.guestPhone || order.user?.phone) && (
              <a
                href={`tel:${order.guestPhone || order.user?.phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                {order.guestPhone || order.user?.phone}
              </a>
            )}
            {(order.guestEmail || order.user?.email) && (
              <a
                href={`mailto:${order.guestEmail || order.user?.email}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="w-3.5 h-3.5" />
                {order.guestEmail || order.user?.email}
              </a>
            )}
          </div>
        </div>

        {/* Статус + управление */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Статус заказа</h2>
          <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
          <p className="text-xs text-muted-foreground">
            Создан: {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Детали доставки */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Детали</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {order.deliveryAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Адрес</p>
                <p>{order.deliveryAddress}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Оплата</p>
              <p>{order.paymentMethod}</p>
            </div>
          </div>
          {order.comment && (
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Комментарий</p>
                <p>{order.comment}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Состав заказа */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Состав заказа</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Товар</th>
                <th className="text-left px-4 py-3 font-semibold">Размер</th>
                <th className="text-right px-4 py-3 font-semibold">Кол-во</th>
                <th className="text-right px-4 py-3 font-semibold">Цена</th>
                <th className="text-right px-5 py-3 font-semibold">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => {
                const qty = Number(item.quantity);
                const price = Number(item.price);
                const unit = item.unitType === "CUBE" ? "м³" : "шт";
                return (
                  <tr key={item.id}>
                    <td className="px-5 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.variantSize}</td>
                    <td className="px-4 py-3 text-right">{qty} {unit}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatPrice(price)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatPrice(qty * price)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30">
              <tr>
                <td colSpan={4} className="px-5 py-3 text-right font-semibold">Итого:</td>
                <td className="px-5 py-3 text-right font-bold text-lg">{formatPrice(Number(order.totalAmount))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
