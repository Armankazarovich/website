import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { sendOrderStatusEmail } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { status } = await req.json();

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status },
  });

  const statusLabels: Record<string, string> = {
    CONFIRMED: "Ваш заказ подтверждён",
    PROCESSING: "Заказ передан в комплектацию",
    SHIPPED: "Ваш заказ отгружен",
    DELIVERED: "Ваш заказ доставлен",
    CANCELLED: "Ваш заказ отменён",
  };

  // Send push notification to user if they're registered
  if (order.userId) {
    if (statusLabels[status]) {
      sendPushToUser(order.userId, {
        title: "ПилоРус",
        body: `${statusLabels[status]} #${order.orderNumber}`,
        url: "/cabinet",
      }).catch(console.error);
    }
  }

  // Send email notification
  if (order.guestEmail || order.userId) {
    let email = order.guestEmail;
    if (!email && order.userId) {
      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } });
      email = user?.email || null;
    }

    if (email && statusLabels[status]) {
      const statusDescriptions: Record<string, string> = {
        CONFIRMED: "Ваш заказ подтверждён менеджером. Мы свяжемся с вами для уточнения деталей доставки.",
        PROCESSING: "Ваш заказ передан в комплектацию. Материалы готовятся к отгрузке.",
        SHIPPED: "Ваш заказ отгружен и доставляется по указанному адресу. Ожидайте звонка водителя.",
        DELIVERED: "Ваш заказ успешно доставлен. Спасибо за покупку в ПилоРус!",
        CANCELLED: "К сожалению, ваш заказ был отменён. Для уточнения деталей позвоните нам.",
      };

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const trackUrl = `${baseUrl}/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.guestPhone || "")}`;

      sendOrderStatusEmail(email, {
        orderNumber: order.orderNumber,
        status,
        statusLabel: statusLabels[status],
        statusDescription: statusDescriptions[status] || "",
        trackUrl,
        customerName: order.guestName || "Клиент",
      }).catch(console.error);
    }
  }

  return NextResponse.json(order);
}
