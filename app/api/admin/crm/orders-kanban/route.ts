export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

// GET /api/admin/crm/orders-kanban — заказы для Kanban по статусам
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where: any = {
    deletedAt: null,
    ...(search ? {
      OR: [
        { guestName: { contains: search, mode: "insensitive" } },
        { guestPhone: { contains: search, mode: "insensitive" } },
        { guestEmail: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { select: { productName: true, variantSize: true, quantity: true, price: true, unitType: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Статистика
  const stats = await prisma.order.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: true,
    _sum: { totalAmount: true },
  });

  return NextResponse.json({ orders, stats });
}

// PATCH /api/admin/crm/orders-kanban — сменить статус заказа из Kanban
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, status } = await req.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId и status обязательны" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    select: { id: true, orderNumber: true, status: true },
  });

  // Синхронизируем лид в CRM если есть
  const lead = await prisma.lead.findFirst({ where: { convertedOrderId: orderId } });
  if (lead) {
    const stageMap: Record<string, string> = {
      NEW: "NEW", CONFIRMED: "CONTACTED", PROCESSING: "QUALIFIED",
      SHIPPED: "PROPOSAL", IN_DELIVERY: "NEGOTIATION", READY_PICKUP: "NEGOTIATION",
      DELIVERED: "WON", COMPLETED: "WON", CANCELLED: "LOST",
    };
    await prisma.lead.update({
      where: { id: lead.id },
      data: { stage: (stageMap[status] || "NEW") as any },
    });
  }

  return NextResponse.json(order);
}
