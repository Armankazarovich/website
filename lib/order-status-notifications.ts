import type { Prisma } from "@prisma/client";
import { recordNotificationCenterEvent } from "@/lib/notification-center";

export const ORDER_STATUS_NOTIFICATION_LABELS: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён",
  PROCESSING: "Заказ передан в комплектацию",
  SHIPPED: "Ваш заказ отгружен",
  IN_DELIVERY: "Ваш заказ доставляется",
  READY_PICKUP: "Ваш заказ готов к выдаче",
  DELIVERED: "Ваш заказ доставлен",
  COMPLETED: "Заказ завершён — самовывоз получен",
  CANCELLED: "Ваш заказ отменён",
};

export const ORDER_STATUS_NOTIFICATION_DESCRIPTIONS: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён менеджером. Мы свяжемся с вами для уточнения деталей доставки.",
  PROCESSING: "Ваш заказ передан в комплектацию. Материалы готовятся к отгрузке.",
  SHIPPED: "Ваш заказ отгружен и доставляется по указанному адресу. Ожидайте звонка водителя.",
  IN_DELIVERY: "Ваш заказ в пути. Водитель уже едет к вам. Ожидайте звонка.",
  READY_PICKUP: "Ваш заказ готов к самовывозу. Приезжайте: г. Химки, ул. Заводская 2А, стр.13.",
  DELIVERED: "Ваш заказ успешно доставлен. Спасибо за покупку в ПилоРус!",
  COMPLETED: "Вы получили заказ самовывозом. Спасибо за покупку в ПилоРус!",
  CANCELLED: "К сожалению, ваш заказ был отменён. Для уточнения деталей позвоните нам.",
};

export type OrderStatusNotificationOrder = {
  id: string;
  orderNumber: number;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  userId: string | null;
};

export function buildOrderStatusNotificationSummary(order: OrderStatusNotificationOrder) {
  return {
    customerEmail: Boolean(order.guestEmail),
    customerPush: Boolean(order.userId),
    staffSystem: true,
    staffPush: true,
    telegram: true,
  };
}

function customerLabel(order: OrderStatusNotificationOrder) {
  return order.guestName || order.guestPhone || order.guestEmail || "Клиент";
}

export async function recordStaffOrderStatusNotification({
  tenantId,
  actorId,
  order,
  status,
  previousStatus,
}: {
  tenantId: string;
  actorId?: string | null;
  order: OrderStatusNotificationOrder;
  status: string;
  previousStatus?: string | null;
}) {
  const label = ORDER_STATUS_NOTIFICATION_LABELS[status];
  if (!label) return null;

  const previousLabel = previousStatus
    ? ORDER_STATUS_NOTIFICATION_LABELS[previousStatus] || previousStatus
    : null;
  const channels = buildOrderStatusNotificationSummary(order);
  const bodyParts = [
    customerLabel(order),
    previousLabel ? `было: ${previousLabel}` : null,
    order.guestEmail ? `email: ${order.guestEmail}` : "email клиента не указан",
    order.userId ? "клиентский push возможен" : "клиентский push невозможен без аккаунта",
  ].filter(Boolean);

  return recordNotificationCenterEvent({
    tenantId,
    direction: "SYSTEM",
    channel: "SYSTEM",
    status: "SENT",
    source: "ORDER",
    sourceUserId: actorId || null,
    title: `Заказ #${order.orderNumber} — ${label}`,
    body: bodyParts.join(" · "),
    recipientRole: "STAFF",
    entityType: "ORDER",
    entityId: order.id,
    entityLabel: `Заказ #${order.orderNumber}`,
    entityHref: `/admin/orders/${order.id}`,
    metadata: {
      eventKey: "order.status.staff",
      orderNumber: order.orderNumber,
      status,
      previousStatus: previousStatus || null,
      channels,
    } satisfies Prisma.InputJsonObject,
    sentAt: new Date(),
  });
}
