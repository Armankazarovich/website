import { recordNotificationCenterEvent } from "@/lib/notification-center";
import { resolveTelegramCredentials } from "@/lib/telegram-config";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отгружен",
  IN_DELIVERY: "Доставляется",
  READY_PICKUP: "Готов к выдаче",
  DELIVERED: "Доставлен",
  COMPLETED: "Завершён (самовывоз)",
  CANCELLED: "Отменён",
};

export const STATUS_EMOJI: Record<string, string> = {
  NEW: "🆕",
  CONFIRMED: "✅",
  PROCESSING: "⚙️",
  SHIPPED: "🚚",
  IN_DELIVERY: "🛵",
  READY_PICKUP: "📦",
  DELIVERED: "🎉",
  COMPLETED: "🏁",
  CANCELLED: "❌",
};

// Финальные статусы — сообщение в Telegram удаляется автоматически
export const FINAL_STATUSES = ["CANCELLED", "DELIVERED", "COMPLETED"];

type TelegramApiResult = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
  raw?: unknown;
};

type TelegramOrderEventInput = {
  id: string;
  tenantId?: string | null;
  orderNumber: number;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  totalAmount: number;
  sourceUserId?: string | null;
  notificationSource?: string | null;
};

function getTelegramApiError(data: any, fallback: string) {
  if (data && typeof data.description === "string" && data.description.trim()) {
    return data.description.trim();
  }
  if (data && typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  return fallback;
}

async function sendTelegramApi(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<TelegramApiResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    const ok = Boolean(res.ok && data?.ok);
    return {
      ok,
      messageId: ok && data?.result?.message_id ? String(data.result.message_id) : null,
      error: ok ? null : getTelegramApiError(data, `Telegram API вернул ${res.status}`),
      raw: data,
    };
  } catch (error) {
    return {
      ok: false,
      messageId: null,
      error: error instanceof Error && error.name === "AbortError"
        ? "Telegram API не ответил за 8 секунд"
        : error instanceof Error
          ? error.message
          : "Telegram API недоступен",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function recordTelegramOrderEvent(
  order: TelegramOrderEventInput,
  result: {
    status: "SENT" | "FAILED";
    error?: string | null;
    messageId?: string | null;
    source?: string | null;
    fallbackUsed?: boolean;
  },
) {
  try {
    await recordNotificationCenterEvent({
      tenantId: order.tenantId || "pilorus",
      channel: "TELEGRAM",
      status: result.status,
      source: "ORDER",
      sourceUserId: order.sourceUserId || null,
      title: `Telegram: новый заказ #${order.orderNumber}`,
      body:
        result.status === "SENT"
          ? `Уведомление о новом заказе #${order.orderNumber} отправлено в Telegram.`
          : `Telegram не отправил уведомление о заказе #${order.orderNumber}.`,
      recipientRole: "STAFF",
      sentCount: result.status === "SENT" ? 1 : 0,
      failedCount: result.status === "FAILED" ? 1 : 0,
      error: result.error || null,
      sentAt: result.status === "SENT" ? new Date() : null,
      entityType: "ORDER",
      entityId: order.id,
      entityLabel: `Order #${order.orderNumber}`,
      entityHref: `/admin/orders/${order.id}`,
      metadata: {
        eventKey: "order.created.telegram",
        orderNumber: order.orderNumber,
        customer: order.guestName || order.guestPhone || order.guestEmail || null,
        totalAmount: order.totalAmount,
        source: order.notificationSource || "order-created",
        configSource: result.source || null,
        telegramMessageId: result.messageId || null,
        fallbackUsed: Boolean(result.fallbackUsed),
      },
    });
  } catch (error) {
    console.error("Telegram notification audit error:", error);
  }
}

export const STATUS_FLOW = [
  "NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP", "DELIVERED",
];

export function buildOrderKeyboard(orderId: string, currentStatus: string) {
  const nextButtons = STATUS_FLOW
    .filter((s) => s !== currentStatus && s !== "NEW")
    .map((s) => ({
      text: `${STATUS_EMOJI[s]} ${ORDER_STATUS_LABELS[s]}`,
      callback_data: `st:${orderId}:${s}`,
    }));

  const rows: any[] = [];
  for (let i = 0; i < nextButtons.length; i += 2) {
    rows.push(nextButtons.slice(i, i + 2));
  }

  // Кнопка "Завершён (самовывоз)" — только когда заказ готов к выдаче
  if (currentStatus === "READY_PICKUP") {
    rows.push([{ text: "🏁 Завершён — клиент забрал", callback_data: `st:${orderId}:COMPLETED` }]);
  }

  if (!FINAL_STATUSES.includes(currentStatus)) {
    rows.push([{ text: "❌ Отменить", callback_data: `st:${orderId}:CANCELLED` }]);
  }

  rows.push([{ text: "ℹ️ Инструкция", callback_data: "help" }]);
  rows.push([{ text: "📋 Открыть в админке", url: `https://pilo-rus.ru/admin/orders/${orderId}` }]);

  return { inline_keyboard: rows };
}

export function buildOrderText(
  order: {
    orderNumber: number;
    guestName?: string | null;
    guestPhone?: string | null;
    guestEmail?: string | null;
    deliveryAddress?: string | null;
    paymentMethod: string;
    comment?: string | null;
    totalAmount: number;
    items: Array<{
      productName: string;
      variantSize: string;
      unitType: string;
      quantity: number;
      price: number;
    }>;
  },
  currentStatus: string,
  changedBy?: string
) {
  const statusLabel = ORDER_STATUS_LABELS[currentStatus] || currentStatus;
  const emoji = STATUS_EMOJI[currentStatus] || "📋";
  const payment = order.paymentMethod === "Наличные" ? "💵 Наличные" : "🏦 Безнал по счёту";

  const itemsList = order.items
    .map((i) => {
      const unit = i.unitType === "CUBE" ? "м³" : "шт";
      return `• ${i.productName} ${i.variantSize} × ${Number(i.quantity)} ${unit} = ${(Number(i.price) * Number(i.quantity)).toLocaleString("ru-RU")} ₽`;
    })
    .join("\n");

  return [
    `${emoji} *Статус: ${statusLabel}*`,
    `🛒 *Заказ #${order.orderNumber}*`,
    ``,
    `👤 *Клиент:* ${order.guestName || "—"}`,
    `📞 *Телефон:* ${order.guestPhone || "—"}`,
    order.guestEmail ? `📧 *Email:* ${order.guestEmail}` : null,
    `📍 *Адрес:* ${order.deliveryAddress || "—"}`,
    `💳 *Оплата:* ${payment}`,
    order.comment ? `💬 *Комментарий:* ${order.comment}` : null,
    ``,
    `📦 *Состав заказа:*`,
    itemsList,
    ``,
    `💰 *Итого: ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽*`,
    changedBy ? `` : null,
    changedBy
      ? `✏️ _Изменил: ${changedBy} в ${new Date().toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow",
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })}_`
      : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

export async function sendTelegramOrderNotification(order: {
  id: string;
  tenantId?: string | null;
  orderNumber: number;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  deliveryAddress?: string | null;
  paymentMethod: string;
  comment?: string | null;
  totalAmount: number;
  deliveryCost?: number;
  sourceUserId?: string | null;
  notificationSource?: string | null;
  items: Array<{
    productName: string;
    variantSize: string;
    unitType: string;
    quantity: number;
    price: number;
  }>;
}): Promise<string | null> {
  const credentials = await resolveTelegramCredentials({ tenantId: order.tenantId });
  if (!credentials.ok || !credentials.chatId) {
    const error = credentials.ok ? "Telegram не настроен: telegram_chat_id" : credentials.error;
    await recordTelegramOrderEvent(order, {
      status: "FAILED",
      error,
      source: credentials.source,
    });
    return null;
  }

  const text = buildOrderText(order, "NEW");
  const reply_markup = buildOrderKeyboard(order.id, "NEW");

  const markdownResult = await sendTelegramApi(credentials.token, "sendMessage", {
    chat_id: credentials.chatId,
    text,
    parse_mode: "Markdown",
    reply_markup,
  });

  if (markdownResult.ok) {
    await recordTelegramOrderEvent(order, {
      status: "SENT",
      messageId: markdownResult.messageId,
      source: credentials.source,
    });
    return markdownResult.messageId;
  }

  const plainResult = await sendTelegramApi(credentials.token, "sendMessage", {
    chat_id: credentials.chatId,
    text,
    reply_markup,
  });

  if (plainResult.ok) {
    await recordTelegramOrderEvent(order, {
      status: "SENT",
      messageId: plainResult.messageId,
      source: credentials.source,
      fallbackUsed: true,
    });
    return plainResult.messageId;
  }

  await recordTelegramOrderEvent(order, {
    status: "FAILED",
    error: plainResult.error || markdownResult.error || "Telegram не принял сообщение",
    source: credentials.source,
    fallbackUsed: true,
  });

  return null;
}

// Удалить сообщение из Telegram группы (вызывается при финальных статусах)
export async function deleteTelegramMessage(messageId: string): Promise<void> {
  const credentials = await resolveTelegramCredentials();
  if (!credentials.ok || !credentials.chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${credentials.token}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        message_id: Number(messageId),
      }),
    });
  } catch {
    // Тихо игнорируем — бот может не иметь права удалять
  }
}

export function buildHelpMessages(): string[] {
  const msg1 = [
    `📖 *Инструкция — Работа с заказами ПилоРус*`,
    ``,
    `*Как работает система:*`,
    `*01* Новый заказ → сообщение в группу с деталями и кнопками статусов`,
    `*02* Нажмите нужный статус → база обновляется, клиент получает email`,
    `*03* Сообщение редактируется → видно кто и когда менял статус`,
    `*04* Клиент получает email → всё автоматически, ничего делать не нужно`,
    ``,
    `*Статусы заказов:*`,
    `🆕 *Новый* — Позвонить клиенту и подтвердить заказ`,
    `✅ *Подтверждён* — Детали уточнены, клиент получает email`,
    `⚙️ *В обработке* — Склад комплектует материалы`,
    `🚚 *Отгружен* — Водитель готовится к выезду`,
    `🛵 *Доставляется* — Едет к клиенту, ждёт звонка`,
    `📦 *Готов к выдаче* — Самовывоз, Химки ул. Заводская 2А стр.28`,
    `🎉 *Доставлен* — Успешная доставка, сообщение удалится из группы`,
    `🏁 *Завершён* — Клиент забрал самовывозом, сообщение удалится`,
    `❌ *Отменён* — Уточнить причину у клиента, сообщение удалится`,
  ].join("\n");

  const msg2 = [
    `❓ *Частые вопросы:*`,
    ``,
    `*Можно менять статус с телефона?*`,
    `Да, Telegram работает на любом устройстве одинаково.`,
    ``,
    `*Нажал не тот статус случайно?*`,
    `Нажмите правильный — он перезапишет предыдущий. История изменений видна в сообщении.`,
    ``,
    `*Клиент не получил письмо?*`,
    `Проверьте папку «Спам». Письма приходят от info@pilo\\-rus.ru`,
    ``,
    `*Кнопки пропали у заказа?*`,
    `Заказ в финальном статусе — «Доставлен», «Завершён» или «Отменён». Сообщение автоматически удалено из группы.`,
    ``,
    `*Можно изменить статус через сайт?*`,
    `Да → Заказы в админке → номер заказа → выбор статуса.`,
    ``,
    `*Когда приходят отчёты?*`,
    `Утром в 09:00 МСК (пн–сб) — сводка активных заказов.`,
    `Вечером в 18:00 МСК (пн–сб) — итоги дня с выручкой.`,
    ``,
    `💡 Добавьте *@pilorus\\_orders\\_bot* в избранные Telegram — уведомления всегда под рукой.`,
  ].join("\n");

  return [msg1, msg2];
}

export function buildStaffKeyboard(userId: string) {
  return {
    inline_keyboard: [[
      { text: "✅ Одобрить", callback_data: `staff:${userId}:approve` },
      { text: "❌ Отклонить", callback_data: `staff:${userId}:reject` },
    ]],
  };
}

export async function sendTelegramStatusUpdate(order: {
  id: string;
  tenantId?: string | null;
  orderNumber: number;
  guestName?: string | null;
  status: string;
  totalAmount: number;
  telegramMessageId?: string | null; // если есть — редактируем, иначе новое сообщение
}) {
  const credentials = await resolveTelegramCredentials({ tenantId: order.tenantId });
  if (!credentials.ok || !credentials.chatId) return;

  const emoji = STATUS_EMOJI[order.status] || "🔄";
  const label = ORDER_STATUS_LABELS[order.status] || order.status;
  const reply_markup = buildOrderKeyboard(order.id, order.status);

  const timeStr = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" });

  // Если есть сохранённый message_id — пробуем отредактировать
  if (order.telegramMessageId) {
    const editText = [
      `${emoji} *Статус: ${label}*`,
      `🛒 *Заказ #${order.orderNumber}*`,
      ``,
      `👤 *Клиент:* ${order.guestName || "—"}`,
      `💰 *Сумма: ${order.totalAmount.toLocaleString("ru-RU")} ₽*`,
      ``,
      `✏️ _Изменено в ${timeStr}_`,
    ].join("\n");

    const editRes = await fetch(`https://api.telegram.org/bot${credentials.token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        message_id: Number(order.telegramMessageId),
        text: editText,
        parse_mode: "Markdown",
        reply_markup,
      }),
    }).catch(() => null);

    const editData = editRes ? await editRes.json().catch(() => ({})) : {};
    if (editData?.ok) return; // успешно отредактировали
    // Иначе — падаем вниз и отправляем новое сообщение
  }

  // Нет message_id или редактирование не удалось — отправляем новое сообщение
  const text = [
    `${emoji} *Статус изменён — Заказ #${order.orderNumber}*`,
    ``,
    `👤 Клиент: ${order.guestName || "—"}`,
    `📋 Новый статус: *${label}*`,
    `💰 Сумма: ${order.totalAmount.toLocaleString("ru-RU")} ₽`,
    ``,
    `🕐 _${timeStr}_`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${credentials.token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: credentials.chatId,
      text,
      parse_mode: "Markdown",
      reply_markup,
    }),
  });
}

export async function sendTelegramOrderEdited(order: {
  id: string;
  tenantId?: string | null;
  orderNumber: number;
  guestName?: string | null;
  totalAmount: number;
  deliveryCost?: number;
}) {
  const credentials = await resolveTelegramCredentials({ tenantId: order.tenantId });
  if (!credentials.ok || !credentials.chatId) return;
  const deliveryLine = order.deliveryCost && order.deliveryCost > 0
    ? `\nДоставка: ${order.deliveryCost.toLocaleString("ru-RU")} ₽`
    : "";
  const text = [
    `✏️ *Заказ #${order.orderNumber} изменён*`,
    ``,
    `Клиент: ${order.guestName || "—"}`,
    `Сумма: ${order.totalAmount.toLocaleString("ru-RU")} ₽${deliveryLine}`,
  ].join("\n");

  // Для edited-уведомлений не показываем кнопки статусов — только ссылку в админку
  const reply_markup = {
    inline_keyboard: [[
      { text: "📋 Открыть заказ", url: `https://pilo-rus.ru/admin/orders/${order.id}` },
    ]],
  };

  await fetch(`https://api.telegram.org/bot${credentials.token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: credentials.chatId,
      text,
      parse_mode: "Markdown",
      reply_markup,
    }),
  });
}

export async function handleTelegramCallback(callbackQuery: any) {
  const data: string = callbackQuery.data || "";

  // Format: st:orderId:STATUS
  if (!data.startsWith("st:")) return null;

  const parts = data.split(":");
  if (parts.length < 3) return null;

  const orderId = parts[1];
  const newStatus = parts.slice(2).join(":");

  if (!orderId || !newStatus) return null;

  // Answer callback query to remove loading state
  const credentials = await resolveTelegramCredentials({ requireChatId: false });
  if (credentials.ok) {
    await fetch(`https://api.telegram.org/bot${credentials.token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQuery.id }),
    });
  }

  return { orderId, newStatus };
}
