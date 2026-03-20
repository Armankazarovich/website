import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
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
