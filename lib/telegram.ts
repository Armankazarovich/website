const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отгружен",
  IN_DELIVERY: "Доставляется",
  READY_PICKUP: "Готов к выдаче",
  DELIVERED: "Доставлен",
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
  CANCELLED: "❌",
};

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

  if (currentStatus !== "CANCELLED" && currentStatus !== "DELIVERED") {
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
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const text = buildOrderText(order, "NEW");
  const reply_markup = buildOrderKeyboard(order.id, "NEW");

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      reply_markup,
    }),
  });
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
    `🎉 *Доставлен* — Успешная сделка, считается в дневном отчёте`,
    `❌ *Отменён* — Уточнить причину у клиента`,
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
    `Заказ в финальном статусе — «Доставлен» или «Отменён». Работа завершена.`,
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
  orderNumber: number;
  guestName?: string | null;
  status: string;
  totalAmount: number;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const emoji = STATUS_EMOJI[order.status] || "🔄";
  const label = ORDER_STATUS_LABELS[order.status] || order.status;
  const text = [
    `${emoji} *Статус изменён — Заказ #${order.orderNumber}*`,
    ``,
    `Клиент: ${order.guestName || "—"}`,
    `Новый статус: *${label}*`,
    `Сумма: ${order.totalAmount.toLocaleString("ru-RU")} ₽`,
  ].join("\n");

  const reply_markup = buildOrderKeyboard(order.id, order.status);

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      reply_markup,
    }),
  });
}

export async function sendTelegramOrderEdited(order: {
  id: string;
  orderNumber: number;
  guestName?: string | null;
  totalAmount: number;
  deliveryCost?: number;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const deliveryLine = order.deliveryCost && order.deliveryCost > 0
    ? `\nДоставка: ${order.deliveryCost.toLocaleString("ru-RU")} ₽`
    : "";
  const text = [
    `✏️ *Заказ #${order.orderNumber} изменён*`,
    ``,
    `Клиент: ${order.guestName || "—"}`,
    `Сумма: ${order.totalAmount.toLocaleString("ru-RU")} ₽${deliveryLine}`,
  ].join("\n");

  const reply_markup = buildOrderKeyboard(order.id, "");

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
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
  if (TELEGRAM_BOT_TOKEN) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQuery.id }),
    });
  }

  return { orderId, newStatus };
}
