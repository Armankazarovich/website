export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — aggregate all user media (review photos, avatar, order docs)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Review photos
  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id, images: { isEmpty: false } },
    select: { id: true, images: true, createdAt: true, productId: true },
    orderBy: { createdAt: "desc" },
  });

  const reviewPhotos = reviews.flatMap((r) =>
    r.images.map((url) => ({
      type: "review_photo" as const,
      url,
      date: r.createdAt.toISOString(),
      reviewId: r.id,
      productId: r.productId,
    }))
  );

  // 2. User avatar
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  const avatarItems = user?.avatarUrl
    ? [{ type: "avatar" as const, url: user.avatarUrl, date: new Date().toISOString() }]
    : [];

  // 3. Order invoice PDFs (links)
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, deletedAt: null },
    select: { id: true, orderNumber: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const orderDocs = orders.map((o) => ({
    type: "order_doc" as const,
    url: `/api/cabinet/orders/${o.id}/pdf`,
    date: o.createdAt.toISOString(),
    orderNumber: o.orderNumber,
    orderId: o.id,
  }));

  return NextResponse.json({
    photos: reviewPhotos,
    avatar: avatarItems,
    docs: orderDocs,
    total: reviewPhotos.length + avatarItems.length + orderDocs.length,
  });
}
