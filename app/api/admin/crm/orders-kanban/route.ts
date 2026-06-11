export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, sendPushToStaff } from "@/lib/push";
import { sendOrderStatusEmail } from "@/lib/email";
import { sendTelegramStatusUpdate, deleteTelegramMessage, FINAL_STATUSES } from "@/lib/telegram";
import { enqueueTerminalOrderLifecycle, indexTerminalOrder } from "@/lib/terminal-sync";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { isOrderInventoryError, syncOrderInventoryForStatus } from "@/lib/order-inventory";
import {
  ORDER_STATUS_NOTIFICATION_DESCRIPTIONS,
  ORDER_STATUS_NOTIFICATION_LABELS,
  buildOrderStatusNotificationSummary,
  recordStaffOrderStatusNotification,
} from "@/lib/order-status-notifications";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const ORDER_STATUSES = new Set([
  "NEW",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "IN_DELIVERY",
  "READY_PICKUP",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

// GET /api/admin/crm/orders-kanban — заказы для Kanban по статусам
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = getCurrentTenantId();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where: any = {
    tenantId,
    deletedAt: null,
    ...(search ? {
      OR: [
        { guestName: { contains: search, mode: "insensitive" } },
        { guestPhone: { contains: search, mode: "insensitive" } },
        { guestEmail: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { select: { productName: true, variantSize: true, quantity: true, price: true, unitType: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Статистика
  const stats = await prisma.order.groupBy({
    by: ["status"],
    where: { tenantId, deletedAt: null },
    _count: true,
    _sum: { totalAmount: true },
  });

  return NextResponse.json({ orders, stats });
}

// PATCH /api/admin/crm/orders-kanban — сменить статус + отправить все уведомления
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = getCurrentTenantId();
  const actorId = session.user.id || null;

  const { orderId, status } = await req.json();
  if (status && !ORDER_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId и status обязательны" }, { status: 400 });
  }

  // Получаем текущий заказ (нужен telegramMessageId для редактирования)
  const prevOrder = await prisma.order.findFirst({
    where: { id: orderId, tenantId, deletedAt: null },
    select: { id: true, telegramMessageId: true, status: true },
  });
  if (!prevOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (prevOrder.status === status) {
    return NextResponse.json({ id: prevOrder.id, status: prevOrder.status, unchanged: true });
  }

  // Обновляем статус (финальный — очищаем telegramMessageId)
  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: prevOrder.id },
        data: {
          status,
          ...(FINAL_STATUSES.includes(status) && prevOrder?.telegramMessageId
            ? { telegramMessageId: null }
            : {}),
        },
        include: { items: true },
      });

      await syncOrderInventoryForStatus(tx, updated, {
        tenantId,
        source: "crm-orders-kanban",
        userId: session.user.id,
      });

      return updated;
    });
  } catch (err) {
    if (isOrderInventoryError(err)) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }

  indexTerminalOrder({
    id: order.id,
    orderNumber: order.orderNumber,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    guestEmail: order.guestEmail,
    deliveryAddress: order.deliveryAddress,
    fulfillmentDetail: (order as any).fulfillmentDetail,
    terminalProfile: (order as any).terminalProfile,
    status: order.status,
    paymentStatus: (order as any).paymentStatus,
    totalAmount: order.totalAmount,
    updatedAt: order.updatedAt,
  }).catch(console.error);

  enqueueTerminalOrderLifecycle({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: (order as any).paymentStatus,
    paymentMethod: (order as any).paymentMethod,
    terminalProfile: (order as any).terminalProfile,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    totalAmount: order.totalAmount,
  }, "order.status_changed").catch(console.error);

  await recordStaffOrderStatusNotification({
    tenantId,
    actorId,
    order,
    status,
    previousStatus: prevOrder.status,
  });

  import("@/lib/workflow-engine").then(({ runWorkflows }) => {
    runWorkflows("order_status_changed", {
      tenantId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status,
      previousStatus: prevOrder.status,
      guestName: order.guestName,
      guestPhone: order.guestPhone,
      guestEmail: order.guestEmail || "",
      deliveryAddress: order.deliveryAddress,
      totalAmount: Number(order.totalAmount),
      paymentMethod: (order as any).paymentMethod,
      userId: order.userId || null,
    }).catch(console.error);
  }).catch(() => {});

  // Синхронизируем лид в CRM если есть
  const lead = await prisma.lead.findFirst({ where: { tenantId, convertedOrderId: orderId, deletedAt: null } });
  if (lead) {
    const stageMap: Record<string, string> = {
      NEW: "NEW", CONFIRMED: "CONTACTED", PROCESSING: "QUALIFIED",
      SHIPPED: "PROPOSAL", IN_DELIVERY: "NEGOTIATION", READY_PICKUP: "NEGOTIATION",
      DELIVERED: "WON", COMPLETED: "WON", CANCELLED: "LOST",
    };
    await prisma.lead.update({
      where: { id: lead.id },
      data: { stage: (stageMap[status] || "NEW") as any },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🔔 УВЕДОМЛЕНИЯ — всё как при смене статуса из обычной формы
  // ═══════════════════════════════════════════════════════════

  // 1. Telegram администраторам (редактируем существующее сообщение / создаём новое)
  sendTelegramStatusUpdate({
    id: order.id,
    orderNumber: order.orderNumber,
    guestName: order.guestName,
    status,
    totalAmount: Number(order.totalAmount),
    telegramMessageId: prevOrder?.telegramMessageId ?? null,
  }).catch(console.error);

  // Если финальный — удаляем Telegram сообщение
  if (FINAL_STATUSES.includes(status) && prevOrder?.telegramMessageId) {
    deleteTelegramMessage(prevOrder.telegramMessageId).catch(console.error);
  }

  // 2. Push всем сотрудникам
  if (ORDER_STATUS_NOTIFICATION_LABELS[status]) {
    sendPushToStaff({
      title: `Заказ #${order.orderNumber} — ${ORDER_STATUS_NOTIFICATION_LABELS[status]}`,
      body: order.guestName || "Клиент",
      url: `/admin/orders/${order.id}`,
      icon: "/icons/icon-192x192.png",
    }, {
      tenantId,
      source: "ORDER",
      sourceUserId: actorId,
      recipientRole: "STAFF",
      entityType: "ORDER",
      entityId: order.id,
      entityLabel: `Order #${order.orderNumber}`,
      entityHref: `/admin/orders/${order.id}`,
      metadata: {
        eventKey: "order.status.staff",
        orderNumber: order.orderNumber,
        status,
      },
    }).catch(console.error);
  }

  // 3. Push клиенту (если зарегистрирован)
  if (order.userId && ORDER_STATUS_NOTIFICATION_LABELS[status]) {
    sendPushToUser(order.userId, {
      title: `Заказ #${order.orderNumber} — ${ORDER_STATUS_NOTIFICATION_LABELS[status]}`,
      body: ORDER_STATUS_NOTIFICATION_DESCRIPTIONS[status] || "",
      url: `/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
      icon: "/icons/icon-192x192.png",
    }, {
      tenantId,
      source: "ORDER",
      sourceUserId: actorId,
      recipientLabel: order.guestName || order.guestEmail || order.guestPhone || null,
      entityType: "ORDER",
      entityId: order.id,
      entityLabel: `Order #${order.orderNumber}`,
      entityHref: `/admin/orders/${order.id}`,
      metadata: {
        eventKey: "order.status.customer",
        orderNumber: order.orderNumber,
        status,
      },
    }).catch(console.error);
  }

  // 4. Email клиенту
  if (ORDER_STATUS_NOTIFICATION_LABELS[status]) {
    let email = order.guestEmail;
    if (!email && order.userId) {
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true },
      });
      email = user?.email ?? null;
    }
    if (email) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://pilo-rus.ru";
      sendOrderStatusEmail(email, {
        orderNumber: order.orderNumber,
        status,
        statusLabel: ORDER_STATUS_NOTIFICATION_LABELS[status],
        statusDescription: ORDER_STATUS_NOTIFICATION_DESCRIPTIONS[status] || "",
        trackUrl: `${baseUrl}/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
        customerName: order.guestName || "Клиент",
      }).catch(console.error);
    }
  }

  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    notifications: buildOrderStatusNotificationSummary({
      id: order.id,
      orderNumber: order.orderNumber,
      guestName: order.guestName,
      guestPhone: order.guestPhone,
      guestEmail: order.guestEmail,
      userId: order.userId,
    }),
  });
}
