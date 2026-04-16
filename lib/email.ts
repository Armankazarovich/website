import nodemailer from "nodemailer";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

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

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const mailOptions = {
    from: `"ПилоРус" <${process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_USER,
    to: email,
    subject: "Сброс пароля для вашего аккаунта ПилоРус",
    html: `
      <!DOCTYPE html>
      <html lang="ru">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:#5C3317;padding:28px 36px;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">🪵 ПилоРус</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">Пиломатериалы от производителя</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:36px;">
                  <h2 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;">Восстановление пароля</h2>
                  <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                    Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы создать новый пароль.
                  </p>
                  <a href="${resetUrl}" style="display:inline-block;background:#E8700A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                    Сбросить пароль →
                  </a>
                  <p style="margin:24px 0 0;color:#999;font-size:13px;line-height:1.5;">
                    Ссылка действительна <strong>1 час</strong>. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
                  </p>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                  <p style="margin:0;color:#bbb;font-size:12px;">
                    Если кнопка не работает, скопируйте ссылку:<br>
                    <a href="${resetUrl}" style="color:#E8700A;word-break:break-all;">${resetUrl}</a>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9f9f9;padding:20px 36px;border-top:1px solid #eee;">
                  <p style="margin:0;color:#aaa;font-size:12px;">© 2024 ПилоРус · Химки, ул. Заводская 2А, стр.28 · ${DEFAULT_SETTINGS.phone}</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // В dev режиме выводим ссылку в консоль если SMTP не настроен
    console.error("SMTP error:", err);
    console.log("\n🔗 DEV — ссылка сброса пароля:", resetUrl, "\n");
    throw err;
  }
}

export async function sendOrderStatusEmail(email: string, data: {
  orderNumber: number;
  status: string;
  statusLabel: string;
  statusDescription: string;
  trackUrl: string;
  customerName: string;
}) {
  const statusColors: Record<string, string> = {
    CONFIRMED: "#10b981",
    PROCESSING: "#f59e0b",
    SHIPPED: "#3b82f6",
    DELIVERED: "#10b981",
    CANCELLED: "#ef4444",
  };
  const color = statusColors[data.status] || "#E8700A";

  const mailOptions = {
    from: `"ПилоРус" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Заказ #${data.orderNumber} — ${data.statusLabel} | ПилоРус`,
    html: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-wrap { padding: 16px 12px !important; }
      .email-card { border-radius: 12px !important; }
      .email-header { padding: 22px 20px !important; }
      .email-body { padding: 24px 20px !important; }
      .email-footer { padding: 16px 20px !important; }
      .email-btn { display: block !important; text-align: center !important; padding: 14px 20px !important; }
      .status-block { padding: 14px 16px !important; }
      h1 { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" class="email-wrap" style="background:#f0ede8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" class="email-card" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td class="email-header" style="background:linear-gradient(135deg,#5C3317 0%,#7a4520 100%);padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">🪵 ПилоРус</p>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.65);font-size:12px;">Пиломатериалы от производителя</p>
                </td>
                <td align="right">
                  <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;">Статус заказа</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td class="email-body" style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.5;">Здравствуйте, <strong>${data.customerName}</strong>!</p>
            <div class="status-block" style="background:${color}12;border-left:4px solid ${color};padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:20px;">
              <p style="margin:0 0 4px;font-size:19px;font-weight:700;color:${color};">${data.statusLabel}</p>
              <p style="margin:0;color:#777;font-size:13px;">Заказ <strong style="color:#333;">#${data.orderNumber}</strong></p>
            </div>
            <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.65;">${data.statusDescription}</p>
            <a href="${data.trackUrl}" class="email-btn" style="display:inline-block;background:#E8700A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
              Отследить заказ →
            </a>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0 20px;">
            <p style="margin:0;color:#999;font-size:13px;line-height:1.6;">
              Вопросы? Звоните: <a href="tel:${DEFAULT_SETTINGS.phone_link}" style="color:#E8700A;font-weight:600;text-decoration:none;">${DEFAULT_SETTINGS.phone}</a><br>
              <span style="font-size:12px;">Пн–Сб 9:00–18:00 МСК</span>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td class="email-footer" style="background:#f9f6f2;padding:18px 32px;border-top:1px solid #ede8e0;">
            <p style="margin:0;color:#bbb;font-size:12px;">© 2026 ПилоРус · Химки, ул. Заводская 2А, стр.28</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Status email error:", err);
    throw err;
  }
}
