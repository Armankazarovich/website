export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

// Маппинг статуса заказа → этап CRM
const ORDER_STATUS_TO_LEAD_STAGE: Record<string, string> = {
  NEW:          "NEW",
  CONFIRMED:    "CONTACTED",
  PROCESSING:   "QUALIFIED",
  SHIPPED:      "PROPOSAL",
  IN_DELIVERY:  "NEGOTIATION",
  READY_PICKUP: "NEGOTIATION",
  DELIVERED:    "WON",
  COMPLETED:    "WON",
  CANCELLED:    "LOST",
};

// POST /api/admin/crm/sync-orders — импортировать все заказы в CRM
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Загружаем все заказы которых ещё нет в CRM (по convertedOrderId)
  const existingLeadOrderIds = await prisma.lead.findMany({
    where: { convertedOrderId: { not: null } },
    select: { convertedOrderId: true },
  });
  const alreadySyncedIds = new Set(existingLeadOrderIds.map(l => l.convertedOrderId));

  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const toImport = orders.filter(o => !alreadySyncedIds.has(o.id));

  if (toImport.length === 0) {
    return NextResponse.json({ imported: 0, message: "Все заказы уже в CRM" });
  }

  let imported = 0;
  for (const order of toImport) {
    const stage = ORDER_STATUS_TO_LEAD_STAGE[order.status] || "NEW";
    const itemsSummary = order.items
      .slice(0, 3)
      .map(i => `${i.productName} ${i.variantSize}`)
      .join(", ");

    await prisma.lead.create({
      data: {
        name: order.guestName || "Клиент",
        phone: order.guestPhone || null,
        email: order.guestEmail || null,
        source: "WEBSITE",
        stage: stage as any,
        value: Number(order.totalAmount),
        comment: itemsSummary ? `Заказ #${order.orderNumber}: ${itemsSummary}` : `Заказ #${order.orderNumber}`,
        tags: ["Заказ", `#${order.orderNumber}`],
        convertedOrderId: order.id,
        convertedAt: ["DELIVERED", "COMPLETED"].includes(order.status) ? order.updatedAt : null,
        createdAt: order.createdAt,
      },
    });
    imported++;
  }

  return NextResponse.json({
    imported,
    total: orders.length,
    message: `Импортировано ${imported} заказов в CRM`,
  });
}

// GET — статистика синхронизации
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalOrders, syncedLeads] = await Promise.all([
    prisma.order.count({ where: { deletedAt: null } }),
    prisma.lead.count({ where: { convertedOrderId: { not: null } } }),
  ]);

  return NextResponse.json({
    totalOrders,
    syncedLeads,
    notSynced: totalOrders - syncedLeads,
  });
}
