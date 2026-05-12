export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./orders-client";

type AdminOrdersPageProps = {
  searchParams?: {
    limit?: string | string[];
  };
};

const DEFAULT_LIMIT = 160;
const LIMIT_STEP = 160;
const MAX_LIMIT = 640;

function readLimit(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(DEFAULT_LIMIT, Math.ceil(parsed / LIMIT_STEP) * LIMIT_STEP));
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const limit = readLimit(searchParams?.limit);
  const where = { deletedAt: null };
  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        guestName: true,
        guestPhone: true,
        deliveryAddress: true,
        createdAt: true,
        totalAmount: true,
        deliveryCost: true,
        status: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        gclid: true,
        yclid: true,
        referrer: true,
        items: { select: { id: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const clientOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt.toISOString(),
    totalAmount: order.totalAmount.toString(),
    deliveryCost: order.deliveryCost?.toString() ?? null,
    status: order.status,
    utmSource: order.utmSource,
    utmMedium: order.utmMedium,
    utmCampaign: order.utmCampaign,
    gclid: order.gclid,
    yclid: order.yclid,
    referrer: order.referrer,
    items: order.items,
  }));

  return (
    <div className="admin-page-frame admin-page-frame-fluid">
      <OrdersClient orders={clientOrders} totalCount={totalCount} limit={limit} />
    </div>
  );
}
