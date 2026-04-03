export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (!q || q.length < 2) return NextResponse.json({ orders: [], products: [], clients: [] });

  const [orders, products, clients] = await Promise.all([
    // Заказы: по номеру или гостевым данным
    prisma.order.findMany({
      where: {
        deletedAt: null,
        OR: [
          { guestName:  { contains: q, mode: "insensitive" } },
          { guestEmail: { contains: q, mode: "insensitive" } },
          { guestPhone: { contains: q, mode: "insensitive" } },
          { user: { name:  { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, orderNumber: true, guestName: true, guestEmail: true, totalAmount: true, status: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Товары: по названию
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, category: { select: { name: true } } },
      take: 5,
    }),
    // Клиенты: по имени, email, телефону
    prisma.user.findMany({
      where: {
        role: "USER",
        OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    orders: orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      clientName: o.user?.name || o.guestName || o.guestEmail || "Клиент",
      totalAmount: o.totalAmount.toString(),
      status: o.status,
    })),
    products: products.map(p => ({ id: p.id, name: p.name, category: p.category?.name })),
    clients,
  });
}
