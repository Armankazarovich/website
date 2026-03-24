export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleTelegramCallback, buildOrderText, buildOrderKeyboard } from "@/lib/telegram";
import { sendOrderStatusEmail } from "@/lib/email";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

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
  CONFIRMED: "Ваш заказ подтверждён менеджером. Мы свяжемся с вами для уточнения деталей.",
  PROCESSING: "Ваш заказ передан в комплектацию. Материалы готовятся к отгрузке.",
  SHIPPED: "Ваш заказ отгружен и доставляется по указанному адресу. Ожидайте звонка водителя.",
  IN_DELIVERY: "Ваш заказ в пути! Водитель уже едет к вам. Ожидайте звонка.",
  READY_PICKUP: "Ваш заказ готов к самовывозу. Приезжайте: Химки, ул. Заводская 2А, стр.28",
  DELIVERED: "Ваш заказ успешно доставлен. Спасибо за покупку в ПилоРус!",
  CANCELLED: "К сожалению, ваш заказ был отменён. Для уточнения позвоните нам.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.callback_query) {
      const result = await handleTelegramCallback(body.callback_query);

      if (result?.orderId && result?.newStatus) {
        const order = await prisma.order.update({
          where: { id: result.orderId },
          data: { status: result.newStatus as any },
          include: { items: true },
        });

        // Email клиенту о смене статуса
        if (order.guestEmail && statusLabels[result.newStatus]) {
          sendOrderStatusEmail(order.guestEmail, {
            orderNumber: order.orderNumber,
            status: result.newStatus,
            statusLabel: statusLabels[result.newStatus],
            statusDescription: statusDescriptions[result.newStatus] || "",
            trackUrl: `https://pilo-rus.ru/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
            customerName: order.guestName || "Клиент",
          }).catch(console.error);
        }

        // Имя того кто изменил статус
        const changer = body.callback_query.from;
        const changerName = changer?.username
          ? `@${changer.username}`
          : [changer?.first_name, changer?.last_name].filter(Boolean).join(" ") || "Менеджер";

        // Обновляем сообщение в Telegram
        if (body.callback_query.message && TELEGRAM_BOT_TOKEN) {
          const orderForText = {
            orderNumber: order.orderNumber,
            guestName: order.guestName,
            guestPhone: order.guestPhone,
            guestEmail: order.guestEmail,
            deliveryAddress: order.deliveryAddress,
            paymentMethod: order.paymentMethod,
            comment: order.comment,
            totalAmount: Number(order.totalAmount),
            items: order.items.map((i) => ({
              productName: i.productName,
              variantSize: i.variantSize,
              unitType: i.unitType,
              quantity: Number(i.quantity),
              price: Number(i.price),
            })),
          };

          const text = buildOrderText(orderForText, result.newStatus, changerName);
          const reply_markup = buildOrderKeyboard(order.id, result.newStatus);

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: body.callback_query.message.chat.id,
              message_id: body.callback_query.message.message_id,
              text,
              parse_mode: "Markdown",
              reply_markup,
            }),
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
