export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

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
  const tenantId = getCurrentTenantId();

  // Загружаем все связанные CRM-лиды и обновляем их вместе с импортом новых заказов.
  const existingLeads = await prisma.lead.findMany({
    where: { tenantId, convertedOrderId: { not: null } },
    select: { id: true, convertedOrderId: true },
  });
  const leadByOrderId = new Map(existingLeads.map((lead) => [lead.convertedOrderId, lead.id]));

  const orders = await prisma.order.findMany({
    where: { tenantId, deletedAt: null },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  let imported = 0;
  let updated = 0;
  for (const order of orders) {
    const stage = ORDER_STATUS_TO_LEAD_STAGE[order.status] || "NEW";
    const itemsSummary = order.items
      .slice(0, 3)
      .map(i => `${i.productName} ${i.variantSize}`)
      .join(", ");
    const leadData = {
      name: order.guestName || "Клиент",
      phone: order.guestPhone || null,
      email: order.guestEmail || null,
      source: "WEBSITE" as const,
      stage: stage as any,
      value: Number(order.totalAmount),
      comment: itemsSummary ? `Заказ #${order.orderNumber}: ${itemsSummary}` : `Заказ #${order.orderNumber}`,
      tags: ["Заказ", `#${order.orderNumber}`],
      convertedOrderId: order.id,
      convertedAt: ["DELIVERED", "COMPLETED"].includes(order.status) ? order.updatedAt : null,
      createdAt: order.createdAt,
    };

    const existingLeadId = leadByOrderId.get(order.id);
    if (existingLeadId) {
      await prisma.lead.update({
        where: { id: existingLeadId },
        data: leadData,
      });
      updated++;
      continue;
    }

    await prisma.lead.create({
      data: {
        tenantId,
        ...leadData,
      },
    });
    imported++;
  }

  return NextResponse.json({
    imported,
    updated,
    total: orders.length,
    message: `CRM синхронизирована: новых ${imported}, обновлено ${updated}`,
  });
}

// GET — статистика синхронизации
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = getCurrentTenantId();

  const [totalOrders, syncedLeads] = await Promise.all([
    prisma.order.count({ where: { tenantId, deletedAt: null } }),
    prisma.lead.count({ where: { tenantId, convertedOrderId: { not: null } } }),
  ]);

  return NextResponse.json({
    totalOrders,
    syncedLeads,
    notSynced: totalOrders - syncedLeads,
  });
}
