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
