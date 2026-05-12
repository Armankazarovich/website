export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { Phone, Mail, MapPin, CreditCard, MessageSquare, Package, Radio, Target, Link2, Clock, Truck, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { DeleteOrderButton } from "./delete-button";
import { OrderEditPanel } from "@/components/admin/order-edit-panel";
import { TrackingLinkCard } from "@/components/admin/tracking-link-card";
import { RelatedTasksPanel } from "@/components/admin/related-tasks-panel";
import { classifySource, humanizeSource } from "@/lib/utm";
import { getCurrentTenantId } from "@/lib/tenant-context";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const tenantId = getCurrentTenantId();
  const order = await prisma.order.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!order) notFound();

  const statusColor =
    order.status === "CANCELLED"
      ? "bg-destructive/10 text-destructive"
      : order.status === "DELIVERED" || order.status === "COMPLETED"
        ? "bg-muted text-foreground"
        : "bg-primary/10 text-primary";
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const deliveryCost = Number(order.deliveryCost ?? 0);
  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.price),
    0
  );
  const orderTotal = Number(order.totalAmount);
  const address = order.deliveryAddress?.trim() || "";
  const isPickup =
    order.status === "READY_PICKUP" ||
    order.fulfillmentType === "PICKUP" ||
    order.fulfillmentType === "TAKEAWAY" ||
    order.fulfillmentType === "COUNTER" ||
    address.toLowerCase().startsWith("самовывоз");
  const fulfillmentLabel = isPickup ? "Самовывоз" : "Доставка";
  const fulfillmentPlace = isPickup
    ? address.replace(/^Самовывоз:\s*/i, "").trim() || "Склад"
    : address || "Адрес уточнить";
  const terminalWorkMode = order.terminalWorkMode;
  const receiptMode = order.receiptMode;
  const paymentStatus = order.paymentStatus;
  const fiscalStatus = order.fiscalStatus;
  const workModeLabel =
    terminalWorkMode === "STATION" ? "Касса" :
    terminalWorkMode === "FIELD" ? "Выезд" :
    terminalWorkMode === "MOBILE" ? "Телефон" :
    "Не указано";
  const receiptModeLabel =
    receiptMode === "PRINTER" ? "Принтер" :
    receiptMode === "LATER" ? "После оплаты" :
    receiptMode === "ELECTRONIC" ? "Электронный" :
    "Не указано";
  const paymentStatusLabel =
    paymentStatus === "REQUESTED" ? "Запрошена" :
    paymentStatus === "PAID" ? "Оплачено" :
    paymentStatus === "FAILED" ? "Ошибка" :
    "Ожидает";
  const fiscalStatusLabel =
    fiscalStatus === "AWAITING_PROVIDER" ? "Ждёт провайдера" :
    fiscalStatus === "SENT" ? "Отправлен" :
    fiscalStatus === "FAILED" ? "Ошибка" :
    "Ожидает";
  const publicBaseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://pilo-rus.ru"
  ).replace(/\/$/, "");
  const orderTaskLabel = `Заказ #${order.orderNumber}`;

  return (
    <div className="admin-page-frame admin-page-frame-fluid">
      {/* Шапка */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold">Заказ #{order.orderNumber}</h1>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <DeleteOrderButton orderId={order.id} />
          </div>
        </div>
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
        <TrackingLinkCard orderId={order.id} baseUrl={publicBaseUrl} />
      </div>

      <RelatedTasksPanel
        entityType="ORDER"
        entityId={order.id}
        entityLabel={orderTaskLabel}
        entityHref={`/admin/orders/${order.id}`}
      />

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
                      <p className="font-mono text-xs break-all">{attr.gclid.length > 32 ? `${attr.gclid.slice(0, 32)}...` : attr.gclid}</p>
                    </div>
                  )}
                  {attr.yclid && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">yclid (Яндекс.Директ)</p>
                      <p className="font-mono text-xs break-all">{attr.yclid.length > 32 ? `${attr.yclid.slice(0, 32)}...` : attr.yclid}</p>
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

      {/* Детали получения */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Получение и оплата</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            {isPickup ? (
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            ) : (
              <Truck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">{fulfillmentLabel}</p>
              <p className="break-words">{fulfillmentPlace}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Оплата</p>
              <p>{order.paymentMethod}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <QrCode className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Статус оплаты</p>
              <p>{paymentStatusLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Чек</p>
              <p>{receiptModeLabel} · {fiscalStatusLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Рабочее место</p>
              <p>{workModeLabel}</p>
            </div>
          </div>
          {order.comment && (
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Комментарий</p>
                <p className="break-words">{order.comment}</p>
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
              {order.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    В заказе нет товарных позиций.
                  </td>
                </tr>
              ) : order.items.map((item) => {
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
                <td colSpan={4} className="px-5 py-3 text-right font-semibold">Товары:</td>
                <td className="px-5 py-3 text-right font-semibold">{formatPrice(itemsSubtotal)}</td>
              </tr>
              {deliveryCost > 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-right font-semibold">Доставка:</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatPrice(deliveryCost)}</td>
                </tr>
              )}
              <tr className="border-t border-border">
                <td colSpan={4} className="px-5 py-3 text-right font-semibold">Итого:</td>
                <td className="px-5 py-3 text-right font-bold text-lg">{formatPrice(orderTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
