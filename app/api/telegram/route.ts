export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleTelegramCallback, buildOrderText, buildOrderKeyboard, buildHelpMessages, ORDER_STATUS_LABELS, FINAL_STATUSES } from "@/lib/telegram";
import { sendOrderStatusEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const statusLabels: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён",
  PROCESSING: "Заказ передан в комплектацию",
  SHIPPED: "Ваш заказ отгружен",
  IN_DELIVERY: "Ваш заказ доставляется",
  READY_PICKUP: "Ваш заказ готов к выдаче",
  DELIVERED: "Ваш заказ доставлен",
  COMPLETED: "Заказ завершён — самовывоз получен",
  CANCELLED: "Ваш заказ отменён",
};

const statusDescriptions: Record<string, string> = {
  CONFIRMED: "Ваш заказ подтверждён менеджером. Мы свяжемся с вами для уточнения деталей.",
  PROCESSING: "Ваш заказ передан в комплектацию. Материалы готовятся к отгрузке.",
  SHIPPED: "Ваш заказ отгружен и доставляется по указанному адресу. Ожидайте звонка водителя.",
  IN_DELIVERY: "Ваш заказ в пути! Водитель уже едет к вам. Ожидайте звонка.",
  READY_PICKUP: "Ваш заказ готов к самовывозу. Приезжайте: Химки, ул. Заводская 2А, стр.28",
  DELIVERED: "Ваш заказ успешно доставлен. Спасибо за покупку в ПилоРус!",
  COMPLETED: "Вы получили заказ самовывозом. Спасибо за покупку в ПилоРус!",
  CANCELLED: "К сожалению, ваш заказ был отменён. Для уточнения позвоните нам.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle /start and /help commands
    if (body.message?.text) {
      const msgText = body.message.text as string;

      if (msgText === "/start" || msgText.startsWith("/start@")) {
        const chatId = body.message.chat.id;
        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `👋 *Добро пожаловать в ПилоРус\\!*\n\nЗдесь приходят уведомления о новых заказах\\.\nНажмите /help чтобы получить инструкцию по работе с заказами\\.`,
              parse_mode: "MarkdownV2",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📝 Регистрация сотрудника", url: "https://pilo-rus.ru/join" }],
                  [{ text: "🔐 Войти в AdminPanel", url: "https://pilo-rus.ru/admin" }],
                ],
              },
            }),
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (msgText === "/help" || msgText.startsWith("/help@")) {
        const chatId = body.message.chat.id;
        const messages = buildHelpMessages();
        for (const helpMsg of messages) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: helpMsg,
              parse_mode: "Markdown",
            }),
          });
        }
        return NextResponse.json({ ok: true });
      }
    }

    if (body.callback_query) {
      const data: string = body.callback_query.data || "";

      // Handle help button
      if (data === "help") {
        const chatId = body.callback_query.message?.chat.id;
        if (chatId && TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: body.callback_query.id }),
          });

          const [msg1, msg2] = buildHelpMessages();
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: msg1, parse_mode: "Markdown" }),
          });
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg2,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📝 Регистрация сотрудника", url: "https://pilo-rus.ru/join" }],
                  [{ text: "🔐 Войти в AdminPanel", url: "https://pilo-rus.ru/admin" }],
                ],
              },
            }),
          });
        }
        return NextResponse.json({ ok: true });
      }

      // Handle staff approve/reject
      if (data.startsWith("staff:")) {
        const parts = data.split(":");
        const userId = parts[1];
        const action = parts[2];

        if (userId && action && TELEGRAM_BOT_TOKEN) {
          const newStatus = action === "approve" ? "ACTIVE" : "SUSPENDED";

          await prisma.user.update({
            where: { id: userId },
            data: { staffStatus: newStatus as any },
          });

          // Answer callback with alert
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: body.callback_query.id,
              text: action === "approve" ? "✅ Сотрудник одобрен!" : "❌ Сотрудник отклонён",
              show_alert: true,
            }),
          });

          // Edit original message — remove buttons, add status line
          if (body.callback_query.message) {
            const changer = body.callback_query.from;
            const changerName = changer?.username
              ? `@${changer.username}`
              : [changer?.first_name, changer?.last_name].filter(Boolean).join(" ") || "Администратор";

            const statusLine = action === "approve"
              ? `\n\n✅ *Одобрен* — ${changerName}`
              : `\n\n❌ *Отклонён* — ${changerName}`;

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: body.callback_query.message.chat.id,
                message_id: body.callback_query.message.message_id,
                text: body.callback_query.message.text + statusLine,
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: [] },
              }),
            });
          }
        }

        return NextResponse.json({ ok: true });
      }

      const result = await handleTelegramCallback(body.callback_query);

      if (result?.orderId && result?.newStatus) {
        const isFinal = FINAL_STATUSES.includes(result.newStatus);

        // При финальном статусе — получаем telegramMessageId ДО обновления
        let telegramMsgId: string | null = null;
        if (isFinal) {
          const cur = await prisma.order.findUnique({
            where: { id: result.orderId },
            select: { telegramMessageId: true },
          });
          telegramMsgId = cur?.telegramMessageId ?? null;
        }

        const order = await prisma.order.update({
          where: { id: result.orderId },
          data: {
            status: result.newStatus as any,
            ...(isFinal ? { telegramMessageId: null } : {}),
          },
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

        // Push уведомление клиенту о смене статуса
        if (order.userId && statusLabels[result.newStatus]) {
          sendPushToUser(order.userId, {
            title: `Заказ #${order.orderNumber} — ${ORDER_STATUS_LABELS[result.newStatus] || result.newStatus}`,
            body: statusDescriptions[result.newStatus] || "",
            url: `/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
            icon: "/icons/icon-192x192.png",
          }).catch(console.error);
        }

        // Имя того кто изменил статус
        const changer = body.callback_query.from;
        const changerName = changer?.username
          ? `@${changer.username}`
          : [changer?.first_name, changer?.last_name].filter(Boolean).join(" ") || "Менеджер";

        if (body.callback_query.message && TELEGRAM_BOT_TOKEN) {
          const msgChatId = body.callback_query.message.chat.id;
          const msgId = body.callback_query.message.message_id;

          if (isFinal) {
            // Финальный статус — удаляем сообщение из группы
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, message_id: msgId }),
            }).catch(() => {});

            // Также удаляем сохранённое сообщение (если отличается от текущего)
            if (telegramMsgId && String(telegramMsgId) !== String(msgId)) {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: msgChatId, message_id: Number(telegramMsgId) }),
              }).catch(() => {});
            }
          } else {
            // Обновляем сообщение в Telegram (не финальный статус)
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
                chat_id: msgChatId,
                message_id: msgId,
                text,
                parse_mode: "Markdown",
                reply_markup,
              }),
            });
          }
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
