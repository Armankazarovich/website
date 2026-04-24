export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    deliveryCost: Number((order as any).deliveryCost ?? 0),
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
      "Content-Disposition": `attachment; filename="schet-${order.orderNumber}.pdf"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
