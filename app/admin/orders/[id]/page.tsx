export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { Phone, Mail, MapPin, CreditCard, MessageSquare, Package, Radio, Target, Link2, Clock } from "lucide-react";
import { AdminBack } from "@/components/admin/admin-back";
import { DeleteOrderButton } from "./delete-button";
import { OrderEditPanel } from "@/components/admin/order-edit-panel";
import { TrackingLinkCard } from "@/components/admin/tracking-link-card";
import { classifySource, humanizeSource } from "@/lib/utm";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!order) notFound();

  const statusColor = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Шапка */}
      <div className="flex items-center gap-3 flex-wrap">
        <AdminBack />
        <h1 className="font-display font-bold text-2xl">Заказ #{order.orderNumber}</h1>
        <span className={`ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <OrderEditPanel order={{
            id: order.id,
            guestName: order.guestName,
            guestPhone: order.guestPhone,
            guestEmail: order.guestEmail,
            deliveryAddress: order.deliveryAddress,
            comment: order.comment,
            paymentMethod: order.paymentMethod,
            totalAmount: Number(order.totalAmount),
            deliveryCost: Number((order as any).deliveryCost ?? 0),
            items: order.items.map((item) => ({
              id: item.id,
              variantId: item.variantId || "",
              productName: item.productName,
              variantSize: item.variantSize,
              unitType: item.unitType,
              quantity: Number(item.quantity),
              price: Number(item.price),
            })),
          }} />
          <DeleteOrderButton orderId={order.id} />
        </div>
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
          <p className="text-sm text-muted-foreground">
            Создан: {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Ссылка отслеживания */}
      <TrackingLinkCard orderId={order.id} />

      {/* Источник заказа (UTM attribution) */}
      {(() => {
        const attr = {
          utmSource: (order as any).utmSource as string | null,
          utmMedium: (order as any).utmMedium as string | null,
          utmCampaign: (order as any).utmCampaign as string | null,
          utmTerm: (order as any).utmTerm as string | null,
          utmContent: (order as any).utmContent as string | null,
          gclid: (order as any).gclid as string | null,
          yclid: (order as any).yclid as string | null,
          referrer: (order as any).referrer as string | null,
          landingPage: (order as any).landingPage as string | null,
          firstTouchAt: (order as any).firstTouchAt as Date | null,
        };
        const hasAttribution =
          attr.utmSource || attr.utmMedium || attr.utmCampaign || attr.gclid || attr.yclid || attr.referrer;
        const group = classifySource(attr as any);
        const { label, color } = humanizeSource(group);
        return (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Источник заказа
            </h2>
            {!hasAttribution ? (
              <p className="text-sm text-muted-foreground">
                Прямой переход или заказ создан оператором (без UTM-меток).
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-current ${color} text-xs font-semibold`}>
                    <Target className="w-3.5 h-3.5" />
                    {label}
                  </span>
                  {attr.utmCampaign && (
                    <span className="text-sm text-foreground font-medium">· {attr.utmCampaign}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {attr.utmSource && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">utm_source</p>
                      <p className="font-mono text-xs">{attr.utmSource}</p>
                    </div>
                  )}
                  {attr.utmMedium && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">utm_medium</p>
                      <p className="font-mono text-xs">{attr.utmMedium}</p>
                    </div>
                  )}
                  {attr.utmTerm && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">utm_term</p>
                      <p className="font-mono text-xs break-all">{attr.utmTerm}</p>
                    </div>
                  )}
                  {attr.utmContent && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">utm_content</p>
                      <p className="font-mono text-xs break-all">{attr.utmContent}</p>
                    </div>
                  )}
                  {attr.gclid && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">gclid (Google Ads)</p>
                      <p className="font-mono text-xs break-all">{attr.gclid.slice(0, 32)}…</p>
                    </div>
                  )}
                  {attr.yclid && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">yclid (Яндекс.Директ)</p>
                      <p className="font-mono text-xs break-all">{attr.yclid.slice(0, 32)}…</p>
                    </div>
                  )}
                  {attr.referrer && (
                    <div className="sm:col-span-2 flex items-start gap-2">
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Реферер</p>
                        <p className="text-xs break-all">{attr.referrer}</p>
                      </div>
                    </div>
                  )}
                  {attr.landingPage && (
                    <div className="sm:col-span-2">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Страница входа</p>
                      <p className="font-mono text-xs break-all">{attr.landingPage}</p>
                    </div>
                  )}
                  {attr.firstTouchAt && (
                    <div className="sm:col-span-2 flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">Первое касание: {formatDate(attr.firstTouchAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Детали доставки */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Детали</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {order.deliveryAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Адрес</p>
                <p>{order.deliveryAddress}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Оплата</p>
              <p>{order.paymentMethod}</p>
            </div>
          </div>
          {order.comment && (
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Комментарий</p>
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
