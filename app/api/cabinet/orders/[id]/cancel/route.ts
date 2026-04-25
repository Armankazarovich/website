export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendTelegramStatusUpdate, deleteTelegramMessage } from "@/lib/telegram";
import { sendPushToStaff } from "@/lib/push";

const limiter = rateLimit("cabinet-cancel", 5, 60_000);

// Статусы при которых клиент ещё может отменить заказ сам
const CANCELLABLE = ["NEW", "CONFIRMED"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!limiter.check(session.user.id)) {
    return NextResponse.json({ error: "Слишком часто. Попробуйте через минуту." }, { status: 429 });
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

  if (order.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!CANCELLABLE.includes(order.status)) {
    return NextResponse.json(
      {
        error: `Заказ уже в статусе «${order.status}» — отменить может только менеджер. Позвоните нам.`,
      },
      { status: 409 }
    );
  }

  // Причина (опциональная)
  let reason: string | null = null;
  try {
    const body = await req.json();
    if (body?.reason && typeof body.reason === "string") {
      reason = body.reason.trim().slice(0, 500) || null;
    }
  } catch {
    /* no body — ок */
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      comment: reason
        ? `${order.comment ? order.comment + "\n\n" : ""}Отменён клиентом: ${reason}`
        : order.comment,
    },
  });

  // Удаляем сообщение из Telegram группы (финальный статус)
  if (order.telegramMessageId) {
    deleteTelegramMessage(order.telegramMessageId).catch(() => {});
    prisma.order
      .update({ where: { id: order.id }, data: { telegramMessageId: null } })
      .catch(() => {});
  }

  // Новое сообщение сотрудникам в Telegram + Push
  sendTelegramStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    guestName: updated.guestName,
    status: "CANCELLED",
    totalAmount: Number(updated.totalAmount),
    telegramMessageId: null,
  }).catch(() => {});

  sendPushToStaff({
    title: `Заказ #${updated.orderNumber} отменён клиентом`,
    body: `${updated.guestName || "Клиент"} отменил заказ${reason ? ": " + reason : ""}`,
    url: `/admin/orders/${updated.id}`,
  }).catch(() => {});

  // ActivityLog
  prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: "CANCEL_ORDER",
        targetId: updated.id,
        meta: { orderNumber: updated.orderNumber, reason: reason || undefined },
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, orderNumber: updated.orderNumber });
}
