import type { Prisma } from "@prisma/client";
import { sendOrderStatusEmail } from "@/lib/email";
import { recordNotificationCenterEvent } from "@/lib/notification-center";
import { prisma } from "@/lib/prisma";

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
  READY_PICKUP: "Ваш заказ готов к самовывозу. Приезжайте: Химки, ул. Заводская 2А, стр.28.",
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

export function buildOrderStatusNotificationSummary(
  order: OrderStatusNotificationOrder,
  customerEmail: string | null = order.guestEmail,
) {
  return {
    customerEmail: Boolean(customerEmail),
    customerPush: Boolean(order.userId),
    staffSystem: true,
    staffPush: true,
    telegram: true,
  };
}

function customerLabel(order: OrderStatusNotificationOrder) {
  return order.guestName || order.guestPhone || order.guestEmail || "Клиент";
}

function orderEntity(order: OrderStatusNotificationOrder) {
  return {
    entityType: "ORDER" as const,
    entityId: order.id,
    entityLabel: `Заказ #${order.orderNumber}`,
    entityHref: `/admin/orders/${order.id}`,
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 700);
  return String(error || "Неизвестная ошибка").slice(0, 700);
}

export async function resolveOrderStatusCustomerEmail(order: OrderStatusNotificationOrder) {
  if (order.guestEmail) return order.guestEmail;
  if (!order.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { email: true },
  });
  return user?.email || null;
}

export async function sendTrackedOrderStatusEmail({
  tenantId,
  actorId,
  order,
  status,
  email,
  baseUrl,
}: {
  tenantId: string;
  actorId?: string | null;
  order: OrderStatusNotificationOrder;
  status: string;
  email: string | null;
  baseUrl?: string;
}) {
  const label = ORDER_STATUS_NOTIFICATION_LABELS[status];
  if (!label) return { status: "skipped" as const };

  const recipientLabel = email || customerLabel(order);
  const metadata = {
    eventKey: "order.status.customer.email",
    orderNumber: order.orderNumber,
    status,
    hasEmail: Boolean(email),
  } satisfies Prisma.InputJsonObject;

  if (!email) {
    await recordNotificationCenterEvent({
      tenantId,
      direction: "OUTBOUND",
      channel: "EMAIL",
      status: "FAILED",
      source: "ORDER",
      sourceUserId: actorId || null,
      title: `Заказ #${order.orderNumber} — email не отправлен`,
      body: "У клиента не указан email. Уведомите по телефону или добавьте email в заказ.",
      recipientLabel,
      failedCount: 1,
      error: "Email клиента не указан",
      ...orderEntity(order),
      metadata,
    });
    return { status: "missing_email" as const };
  }

  const publicBaseUrl = baseUrl || process.env.NEXTAUTH_URL || "https://pilo-rus.ru";
  try {
    await sendOrderStatusEmail(email, {
      orderNumber: order.orderNumber,
      status,
      statusLabel: label,
      statusDescription: ORDER_STATUS_NOTIFICATION_DESCRIPTIONS[status] || "",
      trackUrl: `${publicBaseUrl}/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
      customerName: order.guestName || "Клиент",
    });

    await recordNotificationCenterEvent({
      tenantId,
      direction: "OUTBOUND",
      channel: "EMAIL",
      status: "SENT",
      source: "ORDER",
      sourceUserId: actorId || null,
      title: `Заказ #${order.orderNumber} — email отправлен`,
      body: `${label}. Письмо о статусе заказа отправлено клиенту.`,
      recipientLabel,
      sentCount: 1,
      sentAt: new Date(),
      ...orderEntity(order),
      metadata,
    });
    return { status: "sent" as const };
  } catch (error) {
    const message = normalizeError(error);
    await recordNotificationCenterEvent({
      tenantId,
      direction: "OUTBOUND",
      channel: "EMAIL",
      status: "FAILED",
      source: "ORDER",
      sourceUserId: actorId || null,
      title: `Заказ #${order.orderNumber} — email не отправлен`,
      body: "Почтовый сервер не принял письмо о смене статуса.",
      recipientLabel,
      failedCount: 1,
      error: message,
      ...orderEntity(order),
      metadata: {
        ...metadata,
        error: message,
      } satisfies Prisma.InputJsonObject,
    });
    return { status: "failed" as const, error: message };
  }
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
