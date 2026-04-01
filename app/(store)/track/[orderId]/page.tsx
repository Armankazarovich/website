export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { TrackOrderClient } from "./track-client";

export async function generateMetadata({ params }: { params: { orderId: string } }) {
  return {
    title: `Отслеживание заказа #${params.orderId.slice(0, 8).toUpperCase()} — ПилоРус`,
    robots: { index: false, follow: false },
  };
}

export default async function TrackOrderPage({ params }: { params: { orderId: string } }) {
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.orderId, deletedAt: null },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { name: true, images: true, slug: true } },
              },
            },
          },
        },
      },
    }),
    getSiteSettings(),
  ]);

  if (!order) notFound();

  // Serialise Decimal → number so it's safe to pass to client component
  const serialised = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    guestEmail: order.guestEmail,
    deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod,
    comment: order.comment,
    totalAmount: Number(order.totalAmount),
    deliveryCost: Number((order as any).deliveryCost ?? 0),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantSize: item.variantSize,
      unitType: item.unitType,
      quantity: Number(item.quantity),
      price: Number(item.price),
      productImage: item.variant?.product?.images?.[0] ?? null,
      productSlug: item.variant?.product?.slug ?? null,
    })),
  };

  return <TrackOrderClient order={serialised} settings={settings} />;
}
