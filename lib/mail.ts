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
  },
  pdfBuffer?: Buffer
) {
  const itemsHtml = order.items
    .map((item) => {
      const unit = item.unitType === "CUBE" ? "м³" : "шт";
      const total = (item.price * item.quantity).toLocaleString("ru-RU");
      return `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;">
          <p style="margin:0;font-size:14px;color:#1a1a1a;font-weight:600;line-height:1.3;">${item.productName}</p>
          <p style="margin:3px 0 0;font-size:12px;color:#999;">${item.variantSize} · ${item.quantity} ${unit}</p>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;text-align:right;white-space:nowrap;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;">${total} ₽</p>
        </td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-wrap { padding: 12px 8px !important; }
      .email-card { border-radius: 12px !important; }
      .email-header { padding: 22px 20px !important; }
      .email-body { padding: 22px 16px !important; }
      .email-footer { padding: 14px 16px !important; }
      .order-badge { padding: 12px 14px !important; }
      .order-num { font-size: 16px !important; }
      .total-row td { padding: 12px 16px !important; font-size: 15px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" class="email-wrap" style="background:#f0ede8;padding:28px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" class="email-card" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td class="email-header" style="background:linear-gradient(135deg,#5C3317 0%,#7a4520 100%);padding:26px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🪵 ПилоРус</p>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:12px;">Пиломатериалы от производителя</p>
                </td>
                <td align="right">
                  <p style="margin:0;background:rgba(255,255,255,0.15);color:#ffffff;font-size:13px;font-weight:700;padding:6px 12px;border-radius:8px;">✅ Принят</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="email-body" style="padding:26px 28px;">

            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.5;">
              Здравствуйте, <strong style="color:#1a1a1a;">${order.customerName}</strong>!<br>
              Ваш заказ успешно оформлен.
            </p>

            <!-- Order badge -->
            <div class="order-badge" style="background:#fff8f0;border:1.5px solid #E8700A30;border-left:4px solid #E8700A;padding:14px 18px;border-radius:0 10px 10px 0;margin-bottom:24px;">
              <p class="order-num" style="margin:0 0 3px;font-size:18px;font-weight:700;color:#E8700A;">Заказ #${order.orderNumber}</p>
              <p style="margin:0;color:#888;font-size:13px;">Менеджер свяжется с вами в ближайшее время</p>
            </div>

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #f0ede8;border-radius:10px;overflow:hidden;margin-bottom:0;">
              <thead>
                <tr style="background:#f9f6f2;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Товар</th>
                  <th style="padding:10px 16px;text-align:right;font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Сумма</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr class="total-row" style="background:#f9f6f2;border-top:2px solid #E8700A30;">
                  <td style="padding:14px 16px;font-size:14px;color:#777;">Способ оплаты: <strong style="color:#333;">${order.paymentMethod}</strong></td>
                  <td style="padding:14px 16px;text-align:right;font-size:17px;font-weight:700;color:#E8700A;white-space:nowrap;">${order.totalAmount.toLocaleString("ru-RU")} ₽</td>
                </tr>
              </tfoot>
            </table>

            ${order.deliveryAddress ? `
            <div style="margin-top:16px;padding:12px 16px;background:#f5f9ff;border-radius:10px;font-size:14px;color:#555;">
              📍 <strong>Адрес доставки:</strong> ${order.deliveryAddress}
            </div>` : ""}

            <hr style="border:none;border-top:1px solid #f0ede8;margin:24px 0 18px;">

            <p style="margin:0;color:#999;font-size:13px;line-height:1.8;">
              Вопросы? Звоните:<br>
              <a href="tel:+79859707133" style="color:#E8700A;font-weight:700;font-size:16px;text-decoration:none;">8-985-970-71-33</a><br>
              <span style="font-size:12px;">Пн–Сб 9:00–18:00 МСК</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-footer" style="background:#f9f6f2;padding:16px 28px;border-top:1px solid #ede8e0;">
            <p style="margin:0;color:#bbb;font-size:12px;">© 2026 ПилоРус · Химки, ул. Заводская 2А, стр.28 · pilo-rus.ru</p>
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
      ...(pdfBuffer
        ? {
            attachments: [
              {
                filename: `schet-${order.orderNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          }
        : {}),
    });
  } catch (err) {
    console.error("Customer confirmation email error:", err);
  }
}
