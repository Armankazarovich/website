export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

/**
 * Скачивание PDF счёта клиентом.
 * Auth: только владелец заказа (userId === session.user.id).
 * Сотрудники пользуются /api/admin/orders/[id]/pdf.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Только свой заказ
  if (order.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pdfOrder = {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    guestEmail: order.guestEmail,
    deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod,
    comment: order.comment,
    totalAmount: Number(order.totalAmount),
    deliveryCost: Number((order as { deliveryCost?: unknown }).deliveryCost ?? 0),
    items: order.items.map((item) => ({
      productName: item.productName,
      variantSize: item.variantSize,
      unitType: item.unitType,
      quantity: Number(item.quantity),
      price: Number(item.price),
    })),
  };

  const buffer = await generateInvoicePdf(pdfOrder);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="schet-${order.orderNumber}.pdf"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
