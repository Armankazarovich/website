export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrdersStaff } from "@/lib/orders-auth";
import { sendCustomerOrderConfirmation } from "@/lib/mail";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendPushToStaff } from "@/lib/push";
import { sendTelegramOrderNotification } from "@/lib/telegram";
import { syncTerminalOrderToCrm } from "@/lib/terminal-crm-sync";
import { createTerminalOrderOps } from "@/lib/terminal-ops";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { applyOrderInventory, isOrderInventoryError } from "@/lib/order-inventory";

const UNIT_TYPES = new Set(["CUBE", "PIECE"]);
const HIDDEN_CATEGORY_SORT_ORDER = 999;

export async function POST(req: NextRequest) {
  const access = await requireOrdersStaff();
  if (!access.authorized) return access.response;
  const { session } = access;
  const tenantId = getCurrentTenantId();

  try {
    const body = await req.json();
    const {
      guestName,
      guestPhone,
      guestEmail,
      deliveryAddress,
      paymentMethod,
      contactMethod,
      contactUsername,
      terminalProfile,
      fulfillmentType,
      fulfillmentDetail,
      workMode,
      receiptMode,
      shiftId,
      comment,
      items,
      deliveryCost,
    } = body;

    if (!guestName || !items?.length) {
      return NextResponse.json({ error: "Обязательные поля: клиент/точка и позиции" }, { status: 400 });
    }

    const normalizedItems = Array.isArray(items)
      ? items.map((item: any) => ({
          variantId: String(item.variantId || ""),
          productName: String(item.productName || ""),
          variantSize: String(item.variantSize || ""),
          unitType: String(item.unitType || ""),
          quantity: Number(item.quantity),
          price: Number(item.price),
        }))
      : [];

    const hasInvalidItem = normalizedItems.some((item) =>
      !item.variantId ||
      !item.productName ||
      !item.variantSize ||
      !UNIT_TYPES.has(item.unitType) ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.price) ||
      item.price <= 0
    );

    if (hasInvalidItem) {
      return NextResponse.json({ error: "Проверьте товары, количество и цену" }, { status: 400 });
    }

    const requestedVariantIds = [...new Set(normalizedItems.map((item) => item.variantId))];
    const allowedVariants = await prisma.productVariant.findMany({
      where: {
        id: { in: requestedVariantIds },
        ...getPublicVariantsFilter(),
        product: {
          tenantId,
          ...getPublicProductsFilter(),
          category: {
            tenantId,
            showInMenu: true,
            sortOrder: { lt: HIDDEN_CATEGORY_SORT_ORDER },
          },
        },
      },
      select: { id: true },
    });
    const allowedVariantIds = new Set(allowedVariants.map((variant) => variant.id));
    const hasUnavailableVariant = requestedVariantIds.some((variantId) => !allowedVariantIds.has(variantId));

    if (hasUnavailableVariant) {
      return NextResponse.json(
        { error: "Товар снят с продажи или нет в наличии. Обновите корзину." },
        { status: 400 }
      );
    }

    const normalizedDeliveryCost = Number(deliveryCost ?? 0);
    if (!Number.isFinite(normalizedDeliveryCost) || normalizedDeliveryCost < 0) {
      return NextResponse.json({ error: "Некорректная стоимость доставки" }, { status: 400 });
    }

    const itemsTotal = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const orderTotal = itemsTotal + normalizedDeliveryCost;
    const normalizedContactMethod = typeof contactMethod === "string" ? contactMethod.trim() : "";
    const normalizedContactUsername = typeof contactUsername === "string" ? contactUsername.trim() : "";
    const normalizedTerminalProfile = typeof terminalProfile === "string" ? terminalProfile.trim() : "";
    const normalizedFulfillmentType = typeof fulfillmentType === "string" ? fulfillmentType.trim() : "";
    const normalizedFulfillmentDetail = typeof fulfillmentDetail === "string" ? fulfillmentDetail.trim() : "";
    const normalizedPaymentMethod = typeof paymentMethod === "string" && paymentMethod.trim()
      ? paymentMethod.trim()
      : "Наличные";
    const normalizedWorkMode = typeof workMode === "string" ? workMode.trim() : "";
    const normalizedReceiptMode = typeof receiptMode === "string" ? receiptMode.trim() : "";
    const normalizedShiftId = typeof shiftId === "string" ? shiftId.trim() : "";
    if (normalizedShiftId) {
      const activeShift = await prisma.cashShift.findFirst({
        where: { id: normalizedShiftId, tenantId, status: "OPEN" },
        select: { id: true },
      });
      if (!activeShift) {
        return NextResponse.json(
          { error: "Открытая кассовая смена не найдена. Обновите терминал и откройте смену заново." },
          { status: 400 }
        );
      }
    }
    const paymentStatus = normalizedPaymentMethod === "QR / ссылка" || normalizedPaymentMethod === "Безнал по счёту"
      ? "REQUESTED"
      : "PENDING";
    const fiscalStatus = normalizedReceiptMode === "LATER" ? "PENDING" : "AWAITING_PROVIDER";
    const pushChannel =
      normalizedContactMethod === "WEBSITE"
        ? "с сайта"
        : normalizedContactMethod === "OFFICE"
          ? "из офиса"
          : normalizedContactMethod === "MESSENGER"
            ? "из чата"
            : "по телефону";

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId,
          guestName: String(guestName).trim(),
          guestPhone: guestPhone ? String(guestPhone).trim() : null,
          guestEmail: guestEmail || null,
          deliveryAddress: normalizedFulfillmentDetail || deliveryAddress || null,
          paymentMethod: normalizedPaymentMethod,
          contactMethod: normalizedContactMethod || "PHONE",
          contactUsername: normalizedContactUsername || null,
          terminalProfile: normalizedTerminalProfile || "lumber",
          terminalWorkMode: normalizedWorkMode || "MOBILE",
          fulfillmentType: normalizedFulfillmentType || null,
          fulfillmentDetail: normalizedFulfillmentDetail || null,
          receiptMode: normalizedReceiptMode || "ELECTRONIC",
          paymentStatus,
          fiscalStatus,
          comment: comment || null,
          totalAmount: orderTotal,
          deliveryCost: normalizedDeliveryCost,
          items: {
            create: normalizedItems.map((item) => ({
              variantId: item.variantId,
              productName: item.productName,
              variantSize: item.variantSize,
              unitType: item.unitType as "CUBE" | "PIECE",
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: { items: true },
      });

      await applyOrderInventory(tx, created, {
        tenantId,
        source: "admin-order-created",
        userId: session.user.id,
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

    const orderDeliveryCost = Number((order as any).deliveryCost ?? 0);

    // Telegram — сохраняем message_id для авто-удаления при финальных статусах
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
      deliveryCost: orderDeliveryCost,
      items: orderItems,
    }).then((msgId) => {
      if (msgId) {
        prisma.order.update({ where: { id: order.id }, data: { telegramMessageId: msgId } }).catch(console.error);
      }
    }).catch(console.error);

    // Push сотрудникам
    sendPushToStaff({
      title: `Заказ ${pushChannel} #${order.orderNumber}`,
      body: `${order.guestName} — ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽`,
      url: `/admin/orders/${order.id}`,
      icon: "/icons/icon-192x192.png",
    }, {
      tenantId,
      source: "ORDER",
      sourceUserId: session.user.id,
      recipientRole: "STAFF",
      entityType: "ORDER",
      entityId: order.id,
      entityLabel: `Order #${order.orderNumber}`,
      entityHref: `/admin/orders/${order.id}`,
      metadata: {
        eventKey: "order.created.staff",
        orderNumber: order.orderNumber,
        source: "admin-terminal",
        terminalProfile: order.terminalProfile,
      },
    }).catch(console.error);

    // Email клиенту + PDF (если email указан)
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
        deliveryCost: orderDeliveryCost,
        items: orderItems,
      }).then((pdfBuffer) =>
        sendCustomerOrderConfirmation(
          order.guestEmail!,
          {
            orderNumber: order.orderNumber,
            customerName: order.guestName || "Клиент",
            totalAmount: Number(order.totalAmount),
            deliveryCost: orderDeliveryCost,
            deliveryAddress: order.deliveryAddress,
            paymentMethod: order.paymentMethod,
            items: orderItems,
          },
          pdfBuffer
        )
      ).catch(console.error);
    }

    // CRM Automation — trigger workflows
    syncTerminalOrderToCrm({
      id: order.id,
      orderNumber: order.orderNumber,
      guestName: order.guestName,
      guestPhone: order.guestPhone,
      guestEmail: order.guestEmail,
      totalAmount: order.totalAmount,
      status: order.status,
      terminalProfile: order.terminalProfile,
      contactMethod: order.contactMethod,
      contactUsername: order.contactUsername,
      tenantId: order.tenantId,
    }).catch(console.error);

    createTerminalOrderOps({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      receiptMode: order.receiptMode,
      terminalProfile: order.terminalProfile,
      fulfillmentType: order.fulfillmentType,
      fulfillmentDetail: order.fulfillmentDetail,
      terminalWorkMode: order.terminalWorkMode,
      tenantId: order.tenantId,
      shiftId: normalizedShiftId || null,
    }, session.user.id).catch(console.error);

    import("@/lib/workflow-engine").then(({ runWorkflows }) => {
      runWorkflows("order_created", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId,
        status: "NEW",
        totalAmount: Number(order.totalAmount),
        customerName: order.guestName || "Клиент",
        customerPhone: order.guestPhone,
      }).catch(console.error);
    }).catch(() => {});

    return NextResponse.json({ orderNumber: order.orderNumber, id: order.id }, { status: 201 });
  } catch (err) {
    if (isOrderInventoryError(err)) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    console.error("Admin order creation error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
