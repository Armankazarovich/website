export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPurchasableQuantityLimit } from "@/lib/product-availability";
import { getPublicVariantsFilter } from "@/lib/product-seo";
import { sendOrderNotification, sendCustomerOrderConfirmation } from "@/lib/mail";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendTelegramOrderNotification } from "@/lib/telegram";
import { sendPushToUser, sendPushToStaff } from "@/lib/push";
import { auth } from "@/lib/auth";
import {
  buildArayBusinessEventPayload,
  buildArayBusinessEventPlan,
  formatArayBusinessEventForCrm,
} from "@/lib/aray-business-events";
import { z } from "zod";
// workflow-engine imported dynamically below to avoid circular deps
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/phone";
import nodemailer from "nodemailer";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { applyOrderInventory, isOrderInventoryError } from "@/lib/order-inventory";

function saleUnitAllows(saleUnit: "CUBE" | "PIECE" | "BOTH", unitType: "CUBE" | "PIECE") {
  return saleUnit === "BOTH" || saleUnit === unitType;
}

const attributionSchema = z.object({
  utmSource: z.string().max(200).nullable().optional(),
  utmMedium: z.string().max(200).nullable().optional(),
  utmCampaign: z.string().max(200).nullable().optional(),
  utmTerm: z.string().max(200).nullable().optional(),
  utmContent: z.string().max(200).nullable().optional(),
  gclid: z.string().max(500).nullable().optional(),
  yclid: z.string().max(500).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
  landingPage: z.string().max(500).nullable().optional(),
  firstTouchAt: z.string().nullable().optional(),
}).optional();

const orderSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().email().optional(),
  ),
  address: z.string().min(5),
  paymentMethod: z.enum(["cash", "invoice"]),
  comment: z.string().optional(),
  legalConsent: z
    .boolean()
    .refine((value) => value, "Подтвердите согласие на обработку персональных данных"),
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
  attribution: attributionSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные заявки" }, { status: 400 });
    }

    const { name, phone, email, address, paymentMethod, comment, items, totalAmount, attribution } = parsed.data;
    const tenantId = getCurrentTenantId();
    const normalizedEmail = email?.toLowerCase().trim() || null;

    // Парсим firstTouchAt если пришёл как строка
    let firstTouchAt: Date | null = null;
    if (attribution?.firstTouchAt) {
      const parsedDate = new Date(attribution.firstTouchAt);
      if (!isNaN(parsedDate.getTime())) firstTouchAt = parsedDate;
    }

    const requestedVariantIds = Array.from(new Set(items.map((item) => item.variantId)));
    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: requestedVariantIds },
        ...getPublicVariantsFilter(),
        product: {
          tenantId,
          active: true,
          images: { isEmpty: false },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            saleUnit: true,
            active: true,
          },
        },
      },
    });
    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const serverItems = items.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (!variant || !saleUnitAllows(variant.product.saleUnit, item.unitType)) return null;

      const price = Number(item.unitType === "CUBE" ? variant.pricePerCube : variant.pricePerPiece);
      const quantity = Number(item.quantity);
      const maxQuantity = getPurchasableQuantityLimit(variant, item.unitType);

      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) return null;
      if (maxQuantity !== null && quantity > maxQuantity + 0.0001) return null;

      return {
        variantId: variant.id,
        productName: variant.product.name,
        variantSize: variant.size,
        unitType: item.unitType,
        quantity,
        price,
      };
    });

    if (serverItems.some((item) => item === null)) {
      return NextResponse.json(
        { error: "Часть товаров уже недоступна или изменила цену. Обновите корзину." },
        { status: 409 },
      );
    }

    const safeOrderItems = serverItems as Array<NonNullable<(typeof serverItems)[number]>>;
    const serverTotal = Number(
      safeOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
    );

    if (Math.abs(serverTotal - totalAmount) > 1) {
      return NextResponse.json(
        { error: "Цены в корзине обновились. Перезагрузите корзину и оформите заказ еще раз." },
        { status: 409 },
      );
    }

    // Привязать заказ к аккаунту если пользователь авторизован
    const session = await auth();
    let userId = session?.user?.id ?? null;

    // Авто-регистрация гостя: создаём аккаунт если email не зарегистрирован
    let autoCreatedPassword: string | null = null;
    if (!userId && normalizedEmail) {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!existing) {
        // Генерируем пароль и создаём аккаунт
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
        autoCreatedPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const passwordHash = await bcrypt.hash(autoCreatedPassword, 12);
        const newUser = await prisma.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            phone: normalizePhone(phone) || phone,
            passwordHash,
          },
        });
        userId = newUser.id;
      } else {
        userId = existing.id;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId,
        userId: userId || undefined,
        guestName: name,
        guestPhone: phone,
        guestEmail: normalizedEmail,
        deliveryAddress: address,
        paymentMethod: paymentMethod === "cash" ? "Наличные" : "Безнал по счёту",
        comment: comment || null,
        totalAmount: serverTotal,
        utmSource: attribution?.utmSource ?? null,
        utmMedium: attribution?.utmMedium ?? null,
        utmCampaign: attribution?.utmCampaign ?? null,
        utmTerm: attribution?.utmTerm ?? null,
        utmContent: attribution?.utmContent ?? null,
        gclid: attribution?.gclid ?? null,
        yclid: attribution?.yclid ?? null,
        referrer: attribution?.referrer ?? null,
        landingPage: attribution?.landingPage ?? null,
        firstTouchAt,
        items: {
          create: safeOrderItems.map((item) => ({
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

      await applyOrderInventory(tx, created, {
        tenantId,
        source: "public-checkout",
        userId,
      });

      return created;
    });

    const orderItems = order.items.map((item) => ({
      productName: item.productName,
      variantSize: item.variantSize,
      unitType: item.unitType,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));
    const orderBusinessEventInput = {
      kind: "order.created" as const,
      source: "orders" as const,
      title: `Заказ #${order.orderNumber}`,
      description: order.comment,
      entity: {
        type: "ORDER",
        id: order.id,
        label: `Заказ #${order.orderNumber}`,
        href: `/admin/orders/${order.id}`,
      },
      customer: {
        name: order.guestName,
        phone: order.guestPhone,
        email: order.guestEmail,
      },
      valueRub: Number(order.totalAmount),
      niche: "lumber" as const,
      context: {
        orderNumber: order.orderNumber,
        itemsCount: order.items.length,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        paymentStatus: order.paymentStatus,
        fiscalStatus: order.fiscalStatus,
      },
    };
    const orderBusinessEventPlan = buildArayBusinessEventPlan(orderBusinessEventInput);
    const orderBusinessEventPayload = buildArayBusinessEventPayload(orderBusinessEventInput, orderBusinessEventPlan);
    const orderAutomationNote = formatArayBusinessEventForCrm(orderBusinessEventPlan);

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
    if (autoCreatedPassword && normalizedEmail) {
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
          to: normalizedEmail,
          subject: "Ваш личный кабинет создан — ПилоРус",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#8B4513;margin-bottom:8px">Личный кабинет создан!</h2>
              <p>Здравствуйте, <strong>${name}</strong>!</p>
              <p>Вместе с вашим заказом <strong>#${order.orderNumber}</strong> мы автоматически создали личный кабинет на сайте ПилоРус.</p>
              <p>Теперь вы можете отслеживать заказы, видеть историю покупок и получать персональные предложения.</p>
              <div style="background:#f5f5f5;border:1px solid #ddd;border-radius:8px;padding:16px 24px;margin:16px 0">
                <p style="margin:0 0 8px;color:#666;font-size:13px">Данные для входа:</p>
                <p style="margin:4px 0;font-size:14px">📧 <strong>Логин:</strong> ${normalizedEmail}</p>
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
      }, {
        tenantId,
        source: "ORDER",
        recipientLabel: order.guestName || order.guestEmail || order.guestPhone || null,
        entityType: "ORDER",
        entityId: order.id,
        entityLabel: `Order #${order.orderNumber}`,
        entityHref: `/admin/orders/${order.id}`,
        metadata: {
          eventKey: "order.created.customer",
          orderNumber: order.orderNumber,
          source: "public-checkout",
        },
      }).catch(console.error);
    }

    // Push сотрудникам — новый заказ
    sendPushToStaff({
      title: `🛒 Новый заказ #${order.orderNumber}`,
      body: `${order.guestName || "Клиент"} — ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽`,
      url: `/admin/orders/${order.id}`,
      icon: "/icons/icon-192x192.png",
    }, {
      tenantId,
      source: "ORDER",
      recipientRole: "STAFF",
      entityType: "ORDER",
      entityId: order.id,
      entityLabel: `Order #${order.orderNumber}`,
      entityHref: `/admin/orders/${order.id}`,
      metadata: {
        eventKey: "order.created.staff",
        orderNumber: order.orderNumber,
        source: "public-checkout",
      },
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

    // 📜 Activity log — PLACE_ORDER (для раздела «История» в кабинете клиента)
    if (userId) {
      prisma.activityLog
        .create({
          data: {
            userId,
            action: "PLACE_ORDER",
            targetId: order.id,
            meta: {
              orderNumber: order.orderNumber,
              totalAmount: Number(order.totalAmount),
              arayBusinessEvent: orderBusinessEventPayload,
            },
          },
        })
        .catch(() => {});
    }

    // 🎯 Авто-создание лида в CRM при новом заказе
    prisma.lead.create({
      data: {
        tenantId,
        name: name,
        phone: phone || null,
        email: normalizedEmail,
        source: "WEBSITE",
        stage: "NEW",
        value: serverTotal,
        comment: `Заказ #${order.orderNumber} — ${safeOrderItems.map(i => `${i.productName} ${i.variantSize}`).join(", ")}`,
        tags: ["Заказ"],
        convertedOrderId: order.id,
      },
    })
      .then((lead) =>
        prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: "NOTE",
            text: orderAutomationNote,
          },
        }),
      )
      .catch(console.error);

    // CRM Automation — trigger workflows
    import("@/lib/workflow-engine").then(({ runWorkflows }) => {
      runWorkflows("order_created", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId,
        status: "NEW",
        totalAmount: Number(serverTotal),
        customerName: name || "Клиент",
        customerPhone: phone || "",
        customerEmail: normalizedEmail || "",
        arayBusinessEvent: orderBusinessEventPayload,
      }).catch(console.error);
    }).catch(() => {});

    return NextResponse.json({ orderNumber: order.orderNumber, id: order.id }, { status: 201 });
  } catch (err) {
    if (isOrderInventoryError(err)) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
