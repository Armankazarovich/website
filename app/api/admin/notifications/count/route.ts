export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!role || !["SUPER_ADMIN","ADMIN","MANAGER","ACCOUNTANT","WAREHOUSE","SELLER","COURIER"].includes(role)) {
      return NextResponse.json({ total: 0, newOrders: 0, pendingReviews: 0, pendingStaff: 0 });
    }

    const isOwner = role === "SUPER_ADMIN" || role === "ADMIN";

    const [newOrders, pendingReviews, pendingStaff] = await Promise.all([
      prisma.order.count({ where: { status: "NEW", deletedAt: null } }),
      isOwner ? prisma.review.count({ where: { approved: false } }) : Promise.resolve(0),
      isOwner ? prisma.user.count({ where: { staffStatus: "PENDING" } }).catch(() => 0) : Promise.resolve(0),
    ]);

    const total = newOrders + pendingReviews + pendingStaff;
    return NextResponse.json({ total, newOrders, pendingReviews, pendingStaff });
  } catch {
    return NextResponse.json({ total: 0, newOrders: 0, pendingReviews: 0, pendingStaff: 0 });
  }
}
