export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderNotification, sendCustomerOrderConfirmation } from "@/lib/mail";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendTelegramOrderNotification } from "@/lib/telegram";
import { sendPushToUser, sendPushToStaff } from "@/lib/push";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/phone";
import nodemailer from "nodemailer";

const orderSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(5),
  paymentMethod: z.enum(["cash", "invoice"]),
  comment: z.string().optional(),
  items: z.array(
    z.object({
      variantId: z.string(),
      productName: z.string(),
      variantSize: z.string(),
      unitType: z.enum(["CUBE", "PIECE"]),
      quantity: z.number().positive(),
      price: z.number().positive(),
    })
  ).min(1),
  totalAmount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные заявки" }, { status: 400 });
    }

    const { name, phone, email, address, paymentMethod, comment, items, totalAmount } = parsed.data;

    // Привязать заказ к аккаунту если пользователь авторизован
    const session = await auth();
    let userId = session?.user?.id ?? null;

    // Авто-регистрация гостя: создаём аккаунт если email не зарегистрирован
    let autoCreatedPassword: string | null = null;
    if (!userId && email) {
      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (!existing) {
        // Генерируем пароль и создаём аккаунт
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
        autoCreatedPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const passwordHash = await bcrypt.hash(autoCreatedPassword, 12);
        const newUser = await prisma.user.create({
          data: {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: normalizePhone(phone) || phone,
            passwordHash,
          },
        });
        userId = newUser.id;
      } else {
        userId = existing.id;
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: userId || undefined,
        guestName: name,
        guestPhone: phone,
        guestEmail: email,
        deliveryAddress: address,
        paymentMethod: paymentMethod === "cash" ? "Наличные" : "Безнал по счёту",
        comment: comment || null,
        totalAmount,
        items: {
          create: items.map((item) => ({
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

    // Admin email
    sendOrderNotification({
      orderNumber: order.orderNumber,
      guestName: order.guestName,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      totalAmount: Number(order.totalAmount),
      deliveryAddress: order.deliveryAddress,
      comment: order.comment,
      paymentMethod: order.paymentMethod,
      items: orderItems,
    }).catch(console.error);

    // Customer confirmation email + PDF
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
        items: orderItems,
      }).then((pdfBuffer) =>
        sendCustomerOrderConfirmation(
          order.guestEmail!,
          {
            orderNumber: order.orderNumber,
            customerName: order.guestName || "Клиент",
            totalAmount: Number(order.totalAmount),
            deliveryAddress: order.deliveryAddress,
            paymentMethod: order.paymentMethod,
            items: orderItems,
          },
          pdfBuffer
        )
      ).catch(console.error);
    }

    // Welcome email с паролем если был создан новый аккаунт
    if (autoCreatedPassword && email) {
      try {
        const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.beget.com",
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
          tls: { rejectUnauthorized: false },
        });
        await transporter.sendMail({
          from: `"ПилоРус" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Ваш личный кабинет создан — ПилоРус",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#8B4513;margin-bottom:8px">Личный кабинет создан!</h2>
              <p>Здравствуйте, <strong>${name}</strong>!</p>
              <p>Вместе с вашим заказом <strong>#${order.orderNumber}</strong> мы автоматически создали личный кабинет на сайте ПилоРус.</p>
              <p>Теперь вы можете отслеживать заказы, видеть историю покупок и получать персональные предложения.</p>
              <div style="background:#f5f5f5;border:1px solid #ddd;border-radius:8px;padding:16px 24px;margin:16px 0">
                <p style="margin:0 0 8px;color:#666;font-size:13px">Данные для входа:</p>
                <p style="margin:4px 0;font-size:14px">📧 <strong>Логин:</strong> ${email}</p>
                <p style="margin:4px 0;font-size:14px">🔑 <strong>Пароль:</strong> <span style="font-family:monospace;font-size:16px;font-weight:bold;letter-spacing:2px">${autoCreatedPassword}</span></p>
              </div>
              <p style="font-size:13px;color:#888">Рекомендуем сменить пароль после первого входа в личном кабинете.</p>
              <a href="https://pilo-rus.ru/login" style="display:inline-block;background:#8B4513;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px">
                Войти в личный кабинет →
              </a>
              <p style="color:#999;font-size:12px;margin-top:24px">ПилоРус — лесоматериалы и строительные материалы</p>
            </div>
          `,
        });
      } catch (e) {
        console.error("Welcome email error:", e);
      }
    }

    // Push клиенту — подтверждение заказа
    if (userId) {
      sendPushToUser(userId, {
        title: `✅ Заказ #${order.orderNumber} принят!`,
        body: `Сумма: ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽. Менеджер свяжется с вами.`,
        url: `/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`,
        icon: "/icons/icon-192x192.png",
      }).catch(console.error);
    }

    // Push сотрудникам — новый заказ
    sendPushToStaff({
      title: `🛒 Новый заказ #${order.orderNumber}`,
      body: `${order.guestName || "Клиент"} — ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽`,
      url: `/admin/orders/${order.id}`,
      icon: "/icons/icon-192x192.png",
    }).catch(console.error);

    // Telegram notification — сохраняем message_id для авто-удаления при финальных статусах
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
      items: orderItems,
    }).then((msgId) => {
      if (msgId) {
        prisma.order.update({ where: { id: order.id }, data: { telegramMessageId: msgId } }).catch(console.error);
      }
    }).catch(console.error);

    return NextResponse.json({ orderNumber: order.orderNumber, id: order.id }, { status: 201 });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
