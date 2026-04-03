export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!role || !["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"].includes(role)) {
      return NextResponse.json({ items: [] });
    }

    const topItems = await prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { price: true },
      _count: { _all: true },
      orderBy: { _sum: { price: "desc" } },
      take: 5,
    });

    return NextResponse.json({
      items: topItems.map((item) => ({
        productName: item.productName,
        totalPrice: Number(item._sum.price || 0),
        count: item._count._all,
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
