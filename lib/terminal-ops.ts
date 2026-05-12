import { prisma } from "@/lib/prisma";
import { enqueueTerminalOrderLifecycle, enqueueTerminalSyncJob, indexTerminalOrder } from "@/lib/terminal-sync";

type TerminalOpsOrder = {
  id: string;
  orderNumber: number;
  totalAmount: unknown;
  paymentMethod: string;
  paymentStatus?: string | null;
  receiptMode?: string | null;
  terminalProfile?: string | null;
  fulfillmentType?: string | null;
  fulfillmentDetail?: string | null;
  terminalWorkMode?: string | null;
  shiftId?: string | null;
};

export async function createTerminalOrderOps(order: TerminalOpsOrder, createdById?: string) {
  const amount = Number(order.totalAmount || 0);
  const shiftId = order.shiftId || null;
  const activeShift = shiftId
    ? await prisma.cashShift.findFirst({
        where: { id: shiftId, status: "OPEN" },
        select: { id: true, workstationId: true },
      })
    : null;

  await indexTerminalOrder({
    id: order.id,
    orderNumber: order.orderNumber,
    terminalProfile: order.terminalProfile,
    fulfillmentDetail: order.fulfillmentDetail,
    paymentStatus: order.paymentStatus,
    totalAmount: amount,
  }).catch(console.error);

  await enqueueTerminalOrderLifecycle({
    id: order.id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    terminalProfile: order.terminalProfile,
    totalAmount: amount,
  }, "order.created").catch(console.error);

  if (amount > 0) {
    const shiftUpdateData =
      activeShift && order.paymentMethod === "Наличные"
        ? {
            salesTotal: { increment: amount },
            expectedCash: { increment: amount },
            orderCount: { increment: 1 },
          }
        : activeShift
          ? {
              salesTotal: { increment: amount },
              orderCount: { increment: 1 },
            }
          : null;

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: order.id,
          shiftId: activeShift?.id || null,
          method: order.paymentMethod,
          status: order.paymentStatus || "PENDING",
          amount,
          provider: order.paymentMethod === "QR / ссылка" ? "manual_qr_pending" : null,
          createdById,
        },
      }),
      ...(activeShift && shiftUpdateData
        ? [
            prisma.cashShift.update({
              where: { id: activeShift.id },
              data: shiftUpdateData,
            }),
            prisma.shiftOperation.create({
              data: {
                shiftId: activeShift.id,
                type: "ORDER_CREATED",
                amount,
                orderId: order.id,
                actorId: createdById,
                note:
                  order.paymentMethod === "Наличные"
                    ? `Кассовая продажа #${order.orderNumber}: наличные учтены в смене`
                    : `Кассовая продажа #${order.orderNumber}: оплата ${order.paymentMethod}`,
                meta: {
                  orderNumber: order.orderNumber,
                  paymentMethod: order.paymentMethod,
                  paymentStatus: order.paymentStatus || "PENDING",
                  terminalProfile: order.terminalProfile,
                },
              },
            }),
          ]
        : []),
    ]).catch(console.error);

    if (order.paymentMethod === "QR / ссылка" || order.paymentStatus === "REQUESTED") {
      await enqueueTerminalSyncJob({
        channel: "payments",
        event: "payment.request.created",
        entityType: "order",
        entityId: order.id,
        priority: 1,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount,
          method: order.paymentMethod,
          status: order.paymentStatus,
          shiftId: activeShift?.id || null,
        },
        idempotencyKey: `payment:request:${order.id}`,
      }).catch(console.error);
    }
  }

  if (order.receiptMode === "PRINTER") {
    await prisma.printJob.create({
      data: {
        orderId: order.id,
        shiftId: activeShift?.id || null,
        workstationId: activeShift?.workstationId || null,
        route: "receipt",
        type: "RECEIPT",
        status: "QUEUED",
        title: `Чек заказа #${order.orderNumber}`,
        createdById,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount,
          paymentMethod: order.paymentMethod,
        },
      },
    }).catch(console.error);

    await enqueueTerminalSyncJob({
      channel: "printing",
      event: "print.receipt.queued",
      entityType: "order",
      entityId: order.id,
      priority: 2,
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount,
        route: "receipt",
      },
      idempotencyKey: `print:receipt:${order.id}`,
    }).catch(console.error);
  }

  if (["restaurant", "construction", "lumber", "retail"].includes(order.terminalProfile || "")) {
    await prisma.printJob.create({
      data: {
        orderId: order.id,
        shiftId: activeShift?.id || null,
        workstationId: activeShift?.workstationId || null,
        route: order.terminalProfile === "restaurant" ? "kitchen" : "production",
        type: "TASK",
        status: "QUEUED",
        title: `${order.terminalProfile === "restaurant" ? "Кухня" : "Задание"} #${order.orderNumber}`,
        createdById,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          profile: order.terminalProfile,
          fulfillmentType: order.fulfillmentType,
          fulfillmentDetail: order.fulfillmentDetail,
        },
      },
    }).catch(console.error);

    await enqueueTerminalSyncJob({
      channel: "printing",
      event: "print.production.queued",
      entityType: "order",
      entityId: order.id,
      priority: 3,
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        profile: order.terminalProfile,
        route: order.terminalProfile === "restaurant" ? "kitchen" : "production",
      },
      idempotencyKey: `print:production:${order.id}`,
    }).catch(console.error);
  }
}
