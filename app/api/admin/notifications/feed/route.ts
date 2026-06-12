export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getAdminNotificationFeed } from "@/lib/admin-notification-feed";
import { normalizeStaffNotificationRole } from "@/lib/notification-settings";

function parseTake(value: string | null) {
  const take = Number(value || 8);
  if (!Number.isFinite(take)) return 8;
  return Math.min(Math.max(Math.floor(take), 1), 20);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = normalizeStaffNotificationRole(session?.user?.role);
  if (!session || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.notifications", role });
  if (!moduleAccess.authorized) {
    return NextResponse.json({
      total: 0,
      newOrders: 0,
      newLeads: 0,
      orderStatuses: 0,
      pendingReviews: 0,
      pendingStaff: 0,
      notificationIssues: 0,
      assignedTasks: 0,
      quietActive: false,
      moduleDisabled: true,
      items: [],
    });
  }

  try {
    const feed = await getAdminNotificationFeed(role, {
      userId: session.user?.id,
      take: parseTake(req.nextUrl.searchParams.get("take")),
      includeItems: true,
    });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("[notifications/feed] failed", error);
    return NextResponse.json({
      total: 0,
      newOrders: 0,
      newLeads: 0,
      orderStatuses: 0,
      pendingReviews: 0,
      pendingStaff: 0,
      notificationIssues: 0,
      assignedTasks: 0,
      quietActive: false,
      degraded: true,
      items: [],
    });
  }
}
