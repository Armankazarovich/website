export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalStaff } from "@/lib/terminal-auth";

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function phoneMatches(candidate: unknown, query: string) {
  const phone = normalizePhone(candidate);
  if (!phone || !query) return false;

  const queryTail = query.slice(-10);
  const phoneTail = phone.slice(-10);
  return phoneTail.includes(queryTail) || queryTail.includes(phoneTail);
}

export async function GET(req: NextRequest) {
  const access = await requireTerminalStaff();
  if (!access.authorized) return access.response;

  const phone = req.nextUrl.searchParams.get("phone") || "";
  const queryPhone = normalizePhone(phone);
  if (queryPhone.length < 7) {
    return NextResponse.json({ customer: null, recentOrders: [], favoriteItems: [] });
  }

  const lookupTail = queryPhone.slice(-4);

  const [users, orders] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "USER",
        phone: { contains: lookupTail },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
      take: 10,
    }),
    prisma.order.findMany({
      where: {
        deletedAt: null,
        guestPhone: { contains: lookupTail },
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const matchedUsers = users.filter((user) => phoneMatches(user.phone, queryPhone));
  const matchedOrders = orders
    .filter((order) => phoneMatches(order.guestPhone, queryPhone))
    .slice(0, 8);

  const user = matchedUsers[0] || null;
  const latestOrder = matchedOrders[0] || null;
  const totalSpent = matchedOrders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.totalAmount) + Number(order.deliveryCost ?? 0), 0);

  const favoriteMap = new Map<string, {
    variantId: string;
    productName: string;
    variantSize: string;
    unitType: "CUBE" | "PIECE";
    quantity: number;
    price: number;
    count: number;
  }>();

  for (const order of matchedOrders) {
    for (const item of order.items) {
      const key = `${item.variantId}:${item.unitType}`;
      const current = favoriteMap.get(key);
      if (current) {
        current.quantity += Number(item.quantity);
        current.count += 1;
        current.price = Number(item.price);
      } else {
        favoriteMap.set(key, {
          variantId: item.variantId,
          productName: item.productName,
          variantSize: item.variantSize,
          unitType: item.unitType,
          quantity: Number(item.quantity),
          price: Number(item.price),
          count: 1,
        });
      }
    }
  }

  const favoriteItems = Array.from(favoriteMap.values())
    .sort((a, b) => b.count - a.count || b.quantity - a.quantity)
    .slice(0, 4);

  return NextResponse.json({
    customer: user || latestOrder
      ? {
          id: user?.id ?? null,
          name: user?.name || latestOrder?.guestName || "",
          email: user?.email || latestOrder?.guestEmail || "",
          phone: user?.phone || latestOrder?.guestPhone || phone,
          address: user?.address || latestOrder?.deliveryAddress || "",
          source: user ? "client" : "order",
          orderCount: matchedOrders.length,
          totalSpent,
          lastOrderAt: latestOrder?.createdAt ?? null,
        }
      : null,
    recentOrders: matchedOrders.slice(0, 4).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      totalAmount: Number(order.totalAmount),
      deliveryCost: Number(order.deliveryCost ?? 0),
      deliveryAddress: order.deliveryAddress,
      terminalProfile: (order as any).terminalProfile,
      fulfillmentType: (order as any).fulfillmentType,
      fulfillmentDetail: (order as any).fulfillmentDetail,
      paymentMethod: order.paymentMethod,
      comment: order.comment,
      items: order.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        variantSize: item.variantSize,
        unitType: item.unitType,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
    })),
    favoriteItems,
  });
}
