import nodemailer from "nodemailer";

const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.beget.com",
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  requireTLS: SMTP_PORT === 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendOrderNotification(order: {
  orderNumber: number;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  totalAmount: string | number;
  deliveryAddress?: string | null;
  comment?: string | null;
  paymentMethod: string;
  items: Array<{
    productName: string;
    variantSize: string;
    unitType: string;
    quantity: string | number;
    price: string | number;
  }>;
}) {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${item.productName}</td>
        <td style="padding:8px;border:1px solid #ddd">${item.variantSize}</td>
        <td style="padding:8px;border:1px solid #ddd">${item.unitType === "CUBE" ? "м³" : "шт"}</td>
        <td style="padding:8px;border:1px solid #ddd">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd">${Number(item.price).toLocaleString("ru-RU")} ₽</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <h2 style="color:#E8700A">Новый заказ #${order.orderNumber}</h2>
    <p><strong>Клиент:</strong> ${order.guestName || "—"}</p>
    <p><strong>Телефон:</strong> ${order.guestPhone || "—"}</p>
    <p><strong>Email:</strong> ${order.guestEmail || "—"}</p>
    <p><strong>Адрес:</strong> ${order.deliveryAddress || "—"}</p>
    <p><strong>Оплата:</strong> ${order.paymentMethod}</p>
    <p><strong>Комментарий:</strong> ${order.comment || "—"}</p>
    <br/>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:8px;border:1px solid #ddd;text-align:left">Товар</th>
          <th style="padding:8px;border:1px solid #ddd">Размер</th>
          <th style="padding:8px;border:1px solid #ddd">Ед.</th>
          <th style="padding:8px;border:1px solid #ddd">Кол-во</th>
          <th style="padding:8px;border:1px solid #ddd">Цена</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <br/>
    <p><strong>Итого: ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽</strong></p>
    <hr/>
    <p style="color:#666;font-size:12px">ПилоРус — pilo-rus.ru</p>
  `;

  try {
    await transporter.sendMail({
      from: `"ПилоРус" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || "info@pilo-rus.ru",
      subject: `Новый заказ #${order.orderNumber} от ${order.guestName || "клиента"}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

export async function sendCustomerOrderConfirmation(
  email: string,
  order: {
    orderNumber: number;
    customerName: string;
    totalAmount: number;
    deliveryAddress?: string | null;
    paymentMethod: string;
    items: Array<{ productName: string; variantSize: string; unitType: string; quantity: number; price: number }>;
  }
) {
  const itemsHtml = order.items
    .map((item) => {
      const unit = item.unitType === "CUBE" ? "м³" : "шт";
      const total = (item.price * item.quantity).toLocaleString("ru-RU");
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">${item.productName} ${item.variantSize}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666;text-align:center;">${item.quantity} ${unit}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right;font-weight:600;">${total} ₽</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#5C3317;padding:28px 36px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🪵 ПилоРус</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">Пиломатериалы от производителя</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="margin:0 0 6px;color:#555;font-size:15px;">Здравствуйте, ${order.customerName}!</p>
            <h2 style="margin:0 0 20px;font-size:20px;color:#1a1a1a;">Ваш заказ принят ✅</h2>
            <div style="background:#E8700A15;border-left:4px solid #E8700A;padding:14px 18px;border-radius:0 10px 10px 0;margin-bottom:24px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#E8700A;">Заказ #${order.orderNumber}</p>
              <p style="margin:4px 0 0;color:#666;font-size:13px;">Менеджер свяжется с вами в ближайшее время</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
              <thead>
                <tr style="background:#f9f9f9;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;">Товар</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;">Кол-во</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;">Сумма</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1a1a1a;text-align:right;">
              Итого: ${order.totalAmount.toLocaleString("ru-RU")} ₽
            </p>
            <p style="margin:0 0 24px;font-size:13px;color:#999;text-align:right;">Оплата: ${order.paymentMethod}</p>
            ${order.deliveryAddress ? `<p style="margin:0 0 24px;font-size:14px;color:#555;">📍 Адрес доставки: ${order.deliveryAddress}</p>` : ""}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="margin:0;color:#999;font-size:13px;">Вопросы? Звоните: <a href="tel:+79859707133" style="color:#E8700A;font-weight:600;">8-985-970-71-33</a></p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:20px 36px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:12px;">© 2026 ПилоРус · Химки, ул. Заводская 2А, стр.28</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"ПилоРус" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Заказ #${order.orderNumber} принят — ПилоРус`,
      html,
    });
  } catch (err) {
    console.error("Customer confirmation email error:", err);
  }
}
