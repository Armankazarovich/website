export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, sendPushToStaff } from "@/lib/push";
import { sendOrderStatusEmail } from "@/lib/email";
import { sendTelegramStatusUpdate, deleteTelegramMessage, FINAL_STATUSES } from "@/lib/telegram";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён",
  PROCESSING: "Заказ передан в комплектацию",
  SHIPPED: "Ваш заказ отгружен",
  IN_DELIVERY: "Ваш заказ доставляется",
  READY_PICKUP: "Ваш заказ готов к выдаче",
  DELIVERED: "Ваш заказ доставлен",
  COMPLETED: "Заказ завершён — самовывоз получен",
  CANCELLED: "Ваш заказ отменён",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён менеджером. Мы свяжемся с вами для уточнения деталей доставки.",
  PROCESSING: "Ваш заказ передан в комплектацию. Материалы готовятся к отгрузке.",
  SHIPPED: "Ваш заказ отгружен и доставляется по указанному адресу. Ожидайте звонка водителя.",
  IN_DELIVERY: "Ваш заказ в пути! Водитель уже едет к вам. Ожидайте звонка.",
  READY_PICKUP: "Ваш заказ готов к самовывозу. Приезжайте: Химки, ул. Заводская 2А, стр.28",
  DELIVERED: "Ваш заказ успешно доставлен. Спасибо за покупку в ПилоРус!",
  COMPLETED: "Вы получили заказ самовывозом. Спасибо за покупку в ПилоРус!",
  CANCELLED: "К сожалению, ваш заказ был отменён. Для уточнения деталей позвоните нам.",
};

// GET /api/admin/crm/orders-kanban — заказы для Kanban по статусам
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where: any = {
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
    where: { deletedAt: null },
    _count: true,
    _sum: { totalAmount: true },
  });

  return NextResponse.json({ orders, stats });
}

// PATCH /api/admin/crm/orders-kanban — сменить статус + отправить все уведомления
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, status } = await req.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId и status обязательны" }, { status: 400 });
  }

  // Получаем текущий заказ (нужен telegramMessageId для редактирования)
  const prevOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { telegramMessageId: true, status: true },
  });

  // Обновляем статус (финальный — очищаем telegramMessageId)
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(FINAL_STATUSES.includes(status) && prevOrder?.telegramMessageId
        ? { telegramMessageId: null }
        : {}),
    },
    include: { items: true },
  });

  // Синхронизируем лид в CRM если есть
  const lead = await prisma.lead.findFirst({ where: { convertedOrderId: orderId } });
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
  if (STATUS_LABELS[status]) {
    sendPushToStaff({
      title: `Заказ #${order.orderNumber} — ${STATUS_LABELS[status]}`,
      body: order.guestName || "Клиент",
      url: `/admin/orders/${order.id}`,
      icon: "/icons/icon-192x192.png",
    }).catch(console.error);
  }

  // 3. Push клиенту (если зарегистрирован)
  if (order.userId && STATUS_LABELS[status]) {
    sendPushToUser(order.userId, {
      title: `Заказ #${order.orderNumber} — ${STATUS_LABELS[status]}`,
      body: STATUS_DESCRIPTIONS[status] || "",
      url: `/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
      icon: "/icons/icon-192x192.png",
    }).catch(console.error);
  }

  // 4. Email клиенту
  if (STATUS_LABELS[status]) {
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
        statusLabel: STATUS_LABELS[status],
        statusDescription: STATUS_DESCRIPTIONS[status] || "",
        trackUrl: `${baseUrl}/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
        customerName: order.guestName || "Клиент",
      }).catch(console.error);
    }
  }

  return NextResponse.json({ id: order.id, orderNumber: order.orderNumber, status: order.status });
}
