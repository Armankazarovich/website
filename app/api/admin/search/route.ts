export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { tenantWhere } from "@/lib/tenant-context";

type ResultType = "order" | "product" | "client";

function scoreText(
  value: string | null | undefined,
  query: string,
  exactScore: number,
  prefixScore: number,
  containsScore: number,
) {
  if (!value) return 0;
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  if (normalizedValue === normalizedQuery) return exactScore;
  if (normalizedValue.startsWith(normalizedQuery)) return prefixScore;
  if (normalizedValue.includes(normalizedQuery)) return containsScore;
  return 0;
}

function resultMeta(resultType: ResultType, matchedFields: string[], score: number) {
  return { resultType, matchedFields, score };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) || "";
  if (!q) return NextResponse.json({ orders: [], products: [], clients: [], meta: { q, textSearch: false } });

  const orderNumber = Number(q.replace(/^#/, ""));
  const canSearchOrders = canAccess(role, "orders");
  const canSearchProducts = canAccess(role, "products");
  const canSearchClients = canAccess(role, "clients");
  const canUseTextEntitySearch = q.length >= 2;

  if (!canSearchOrders && !canSearchProducts && !canSearchClients) {
    return NextResponse.json({ orders: [], products: [], clients: [], meta: { q, textSearch: canUseTextEntitySearch } });
  }

  const orderFilters: any[] = [
    ...(canUseTextEntitySearch ? [
      { guestName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestPhone: { contains: q, mode: "insensitive" } },
      { deliveryAddress: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q, mode: "insensitive" } } },
    ] : []),
  ];
  if (Number.isInteger(orderNumber) && orderNumber > 0) {
    orderFilters.unshift({ orderNumber });
  }

  const [orders, products, clients] = await Promise.all([
    canSearchOrders && orderFilters.length > 0 ? prisma.order.findMany({
      where: {
        ...tenantWhere(),
        deletedAt: null,
        OR: orderFilters,
      },
      select: {
        id: true,
        orderNumber: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        deliveryAddress: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }) : Promise.resolve([]),
    canSearchProducts && canUseTextEntitySearch ? prisma.product.findMany({
      where: {
        ...tenantWhere(),
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, category: { select: { name: true } } },
      take: 5,
    }) : Promise.resolve([]),
    canSearchClients && canUseTextEntitySearch ? prisma.user.findMany({
      where: {
        ...tenantWhere(),
        role: "USER",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 5,
    }) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    orders: orders.map(o => {
      const score = Math.max(
        o.orderNumber === orderNumber ? 100 : 0,
        scoreText(o.guestName, q, 90, 70, 45),
        scoreText(o.guestEmail, q, 90, 70, 45),
        scoreText(o.guestPhone, q, 90, 70, 45),
        scoreText(o.deliveryAddress, q, 70, 50, 25),
        scoreText(o.user?.name, q, 90, 70, 45),
        scoreText(o.user?.email, q, 90, 70, 45),
        scoreText(o.user?.phone, q, 90, 70, 45),
      );
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        clientName: o.user?.name || o.guestName || o.guestEmail || "Клиент",
        totalAmount: o.totalAmount.toString(),
        status: o.status,
        ...resultMeta("order", [
          ...(o.orderNumber === orderNumber ? ["orderNumber"] : []),
          ...(scoreText(o.guestName, q, 90, 70, 45) ? ["guestName"] : []),
          ...(scoreText(o.guestEmail, q, 90, 70, 45) ? ["guestEmail"] : []),
          ...(scoreText(o.guestPhone, q, 90, 70, 45) ? ["guestPhone"] : []),
          ...(scoreText(o.deliveryAddress, q, 70, 50, 25) ? ["deliveryAddress"] : []),
          ...(scoreText(o.user?.name, q, 90, 70, 45) ? ["user.name"] : []),
          ...(scoreText(o.user?.email, q, 90, 70, 45) ? ["user.email"] : []),
          ...(scoreText(o.user?.phone, q, 90, 70, 45) ? ["user.phone"] : []),
        ], score),
      };
    }),
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category?.name,
      ...resultMeta("product", [
        ...(scoreText(p.name, q, 90, 70, 45) ? ["name"] : []),
        ...(scoreText(p.slug, q, 80, 60, 35) ? ["slug"] : []),
      ], Math.max(
        scoreText(p.name, q, 90, 70, 45),
        scoreText(p.slug, q, 80, 60, 35),
      )),
    })),
    clients: clients.map(c => ({
      ...c,
      ...resultMeta("client", [
        ...(scoreText(c.name, q, 90, 70, 45) ? ["name"] : []),
        ...(scoreText(c.email, q, 90, 70, 45) ? ["email"] : []),
        ...(scoreText(c.phone, q, 90, 70, 45) ? ["phone"] : []),
      ], Math.max(
        scoreText(c.name, q, 90, 70, 45),
        scoreText(c.email, q, 90, 70, 45),
        scoreText(c.phone, q, 90, 70, 45),
      )),
    })),
    meta: {
      q,
      textSearch: canUseTextEntitySearch,
      limits: { orders: 5, products: 5, clients: 5 },
      searched: { orders: canSearchOrders, products: canSearchProducts, clients: canSearchClients },
      productFields: ["name", "slug"],
    },
  });
}
