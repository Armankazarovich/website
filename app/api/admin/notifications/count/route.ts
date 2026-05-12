export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getAdminNotificationFeed } from "@/lib/admin-notification-feed";

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!role || !["SUPER_ADMIN","ADMIN","MANAGER","ACCOUNTANT","WAREHOUSE","SELLER","COURIER"].includes(role)) {
      return NextResponse.json({ total: 0, newOrders: 0, pendingReviews: 0, pendingStaff: 0 });
    }
    const moduleAccess = await requireArayModuleAccess({ moduleId: "core.notifications", role });
    if (!moduleAccess.authorized) {
      return NextResponse.json({ total: 0, newOrders: 0, pendingReviews: 0, pendingStaff: 0, moduleDisabled: true });
    }

    const feed = await getAdminNotificationFeed(role, {
      userId: session.user?.id,
      includeItems: false,
    });

    return NextResponse.json(feed);
  } catch {
    return NextResponse.json({ total: 0, newOrders: 0, pendingReviews: 0, pendingStaff: 0 });
  }
}
