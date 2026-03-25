export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushToUser, sendPushToStaff } from "@/lib/push";
import { sendOrderStatusEmail } from "@/lib/email";
import { sendTelegramStatusUpdate } from "@/lib/telegram";

const statusLabels: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён",
  PROCESSING: "Заказ передан в комплектацию",
  SHIPPED: "Ваш заказ отгружен",
  IN_DELIVERY: "Ваш заказ доставляется",
  READY_PICKUP: "Ваш заказ готов к выдаче",
  DELIVERED: "Ваш заказ доставлен",
  CANCELLED: "Ваш заказ отменён",
};

const statusDescriptions: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён менеджером. Мы свяжемся с вами для уточнения деталей доставки.",
  PROCESSING: "Ваш заказ передан в комплектацию. Материалы готовятся к отгрузке.",
  SHIPPED: "Ваш заказ отгружен и доставляется по указанному адресу. Ожидайте звонка водителя.",
  IN_DELIVERY: "Ваш заказ в пути! Водитель уже едет к вам. Ожидайте звонка.",
  READY_PICKUP: "Ваш заказ готов к самовывозу. Приезжайте: Химки, ул. Заводская 2А, стр.28",
  DELIVERED: "Ваш заказ успешно доставлен. Спасибо за покупку в ПилоРус!",
  CANCELLED: "К сожалению, ваш заказ был отменён. Для уточнения деталей позвоните нам.",
};

const STAFF_ROLES = ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { status, guestName, guestPhone, guestEmail, deliveryAddress, comment, paymentMethod, removeItemIds, addItems, totalAmount } = body;

  const updateData: Record<string, any> = {};
  if (status !== undefined) updateData.status = status;
  if (guestName !== undefined) updateData.guestName = guestName || null;
  if (guestPhone !== undefined) updateData.guestPhone = guestPhone || null;
  if (guestEmail !== undefined) updateData.guestEmail = guestEmail || null;
  if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress || null;
  if (comment !== undefined) updateData.comment = comment || null;
  if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
  if (totalAmount !== undefined) updateData.totalAmount = totalAmount;

  // Удалить позиции
  if (removeItemIds?.length) {
    await prisma.orderItem.deleteMany({
      where: { id: { in: removeItemIds }, orderId: params.id },
    });
  }

  // Добавить позиции
  if (addItems?.length) {
    await prisma.orderItem.createMany({
      data: addItems.map((item: any) => ({
        orderId: params.id,
        variantId: item.variantId,
        productName: item.productName,
        variantSize: item.variantSize,
        unitType: item.unitType,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: updateData,
  });

  // Push клиенту
  if (order.userId && statusLabels[status]) {
    sendPushToUser(order.userId, {
      title: `Заказ #${order.orderNumber} — ${statusLabels[status]}`,
      body: statusDescriptions[status] || "",
      url: `/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
      icon: "/icons/icon-192x192.png",
    }).catch(console.error);
  }

  // Telegram + push сотрудникам при смене статуса
  if (status && statusLabels[status]) {
    sendTelegramStatusUpdate({
      id: order.id,
      orderNumber: order.orderNumber,
      guestName: order.guestName,
      status,
      totalAmount: Number(order.totalAmount),
    }).catch(console.error);
    sendPushToStaff({
      title: `Заказ #${order.orderNumber} — ${statusLabels[status]}`,
      body: order.guestName || "Клиент",
      url: `/admin/orders/${order.id}`,
      icon: "/icons/icon-192x192.png",
    }).catch(console.error);
  }

  // Email клиенту
  if (statusLabels[status]) {
    let email = order.guestEmail;
    if (!email && order.userId) {
      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } });
      email = user?.email || null;
    }
    if (email) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://pilo-rus.ru";
      sendOrderStatusEmail(email, {
        orderNumber: order.orderNumber,
        status,
        statusLabel: statusLabels[status],
        statusDescription: statusDescriptions[status] || "",
        trackUrl: `${baseUrl}/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
        customerName: order.guestName || "Клиент",
      }).catch(console.error);
    }
  }

  return NextResponse.json(order);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await prisma.order.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
