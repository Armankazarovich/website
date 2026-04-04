export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendCustomerOrderConfirmation } from "@/lib/mail";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendPushToStaff } from "@/lib/push";
import { sendTelegramOrderNotification } from "@/lib/telegram";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { guestName, guestPhone, guestEmail, deliveryAddress, paymentMethod, comment, items, totalAmount, deliveryCost } = body;

    if (!guestName || !guestPhone || !items?.length) {
      return NextResponse.json({ error: "Обязательные поля: имя, телефон, товары" }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        guestName,
        guestPhone,
        guestEmail: guestEmail || null,
        deliveryAddress: deliveryAddress || null,
        paymentMethod: paymentMethod || "Наличные",
        comment: comment || null,
        totalAmount,
        deliveryCost: deliveryCost || 0,
        items: {
          create: items.map((item: any) => ({
            variantId: item.variantId,
            productName: item.productName,
            variantSize: item.variantSize,
            unitType: item.unitType,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    const orderItems = order.items.map((item) => ({
      productName: item.productName,
      variantSize: item.variantSize,
      unitType: item.unitType,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

    const orderDeliveryCost = Number((order as any).deliveryCost ?? 0);

    // Telegram — сохраняем message_id для авто-удаления при финальных статусах
    sendTelegramOrderNotification({
      id: order.id,
      orderNumber: order.orderNumber,
      guestName: order.guestName,
      guestPhone: order.guestPhone,
      guestEmail: order.guestEmail,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      comment: order.comment,
      totalAmount: Number(order.totalAmount),
      deliveryCost: orderDeliveryCost,
      items: orderItems,
    }).then((msgId) => {
      if (msgId) {
        prisma.order.update({ where: { id: order.id }, data: { telegramMessageId: msgId } }).catch(console.error);
      }
    }).catch(console.error);

    // Push сотрудникам
    sendPushToStaff({
      title: `📞 Заказ по телефону #${order.orderNumber}`,
      body: `${order.guestName} — ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽`,
      url: `/admin/orders/${order.id}`,
      icon: "/icons/icon-192x192.png",
    }).catch(console.error);

    // Email клиенту + PDF (если email указан)
    if (order.guestEmail) {
      generateInvoicePdf({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        guestName: order.guestName,
        guestPhone: order.guestPhone,
        guestEmail: order.guestEmail,
        deliveryAddress: order.deliveryAddress,
        paymentMethod: order.paymentMethod,
        comment: order.comment,
        totalAmount: Number(order.totalAmount),
        deliveryCost: orderDeliveryCost,
        items: orderItems,
      }).then((pdfBuffer) =>
        sendCustomerOrderConfirmation(
          order.guestEmail!,
          {
            orderNumber: order.orderNumber,
            customerName: order.guestName || "Клиент",
            totalAmount: Number(order.totalAmount),
            deliveryCost: orderDeliveryCost,
            deliveryAddress: order.deliveryAddress,
            paymentMethod: order.paymentMethod,
            items: orderItems,
          },
          pdfBuffer
        )
      ).catch(console.error);
    }

    return NextResponse.json({ orderNumber: order.orderNumber, id: order.id }, { status: 201 });
  } catch (err) {
    console.error("Admin order creation error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
