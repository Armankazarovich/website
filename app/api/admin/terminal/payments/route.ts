export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalStaff } from "@/lib/terminal-auth";
import { enqueueTerminalSyncJob } from "@/lib/terminal-sync";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";

const CLIENT_PAYMENT_STATUSES = new Set(["PENDING", "REQUESTED", "FAILED", "CANCELLED"]);
const READ_PAYMENT_STATUSES = new Set([...CLIENT_PAYMENT_STATUSES, "PAID", "REFUNDED"]);

function normalizeOptionalText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export async function GET(req: NextRequest) {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const tenantId = getCurrentTenantId();
  const status = req.nextUrl.searchParams.get("status");
  const normalizedStatus = status ? status.toUpperCase() : null;
  if (normalizedStatus && !READ_PAYMENT_STATUSES.has(normalizedStatus)) {
    return NextResponse.json({ error: "Unknown payment status" }, { status: 400 });
  }
  const where = normalizedStatus ? { tenantId, status: normalizedStatus } : { tenantId };
  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const tenantId = getCurrentTenantId();
  const amount = Number(body.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Некорректная сумма оплаты" }, { status: 400 });
  }

  const requestedStatus = String(body.status || "PENDING").toUpperCase();
  if (!CLIENT_PAYMENT_STATUSES.has(requestedStatus)) {
    return NextResponse.json(
      { error: "Оплата не может стать оплаченной без провайдера или подтверждения." },
      { status: 400 },
    );
  }

  const method = normalizeOptionalText(body.method, 80) || "manual";
  const provider = normalizeOptionalText(body.provider, 80);
  const externalId = normalizeOptionalText(body.externalId, 160);
  const qrPayload = normalizeOptionalText(body.qrPayload, 2000);
  const receiptUrl = normalizeOptionalText(body.receiptUrl, 500);

  const orderId = body.orderId ? String(body.orderId) : null;
  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден или удален" }, { status: 404 });
    }
  }

  const shiftId = body.shiftId ? String(body.shiftId) : null;
  if (shiftId) {
    const shift = await prisma.cashShift.findFirst({
      where: { id: shiftId, tenantId, status: "OPEN" },
      select: { id: true },
    });
    if (!shift) {
      return NextResponse.json({ error: "Открытая смена не найдена" }, { status: 404 });
    }
  }

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      orderId,
      shiftId,
      method,
      status: requestedStatus,
      amount,
      provider,
      externalId,
      qrPayload,
      receiptUrl,
      createdById: auth.session.user.id,
      paidAt: null,
    },
  });

  if (payment.orderId) {
    await prisma.order.updateMany({
      where: { id: payment.orderId, tenantId, deletedAt: null },
      data: { paymentStatus: payment.status },
    }).catch(() => {});

    await Promise.all([
      enqueueTerminalSyncJob({
        tenantId,
        channel: "payments",
        event: String(payment.status).toUpperCase() === "PAID" ? "payment.paid" : "payment.status_changed",
        entityType: "order",
        entityId: payment.orderId,
        priority: 1,
        payload: {
          paymentId: payment.id,
          orderId: payment.orderId,
          method: payment.method,
          status: payment.status,
          amount: Number(payment.amount),
          provider: payment.provider,
        },
        idempotencyKey: `payment:status:${payment.id}:${payment.status}`,
      }),
      enqueueTerminalSyncJob({
        tenantId,
        channel: "notifications",
        event: payment.method === "QR / ссылка" ? "notifications.qr.status_changed" : "notifications.payment.status_changed",
        entityType: "order",
        entityId: payment.orderId,
        priority: 2,
        payload: {
          paymentId: payment.id,
          orderId: payment.orderId,
          method: payment.method,
          status: payment.status,
          amount: Number(payment.amount),
        },
        idempotencyKey: `notifications:payment:${payment.id}:${payment.status}`,
      }),
    ]).catch(console.error);
  }

  return NextResponse.json({ payment }, { status: 201 });
}
