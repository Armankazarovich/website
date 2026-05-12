export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeNotificationEntity, recordNotificationCenterEvent, resolveNotificationStatus } from "@/lib/notification-center";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function getWebPush() {
  const webpush = require("web-push");
  webpush.setVapidDetails(
    "mailto:info@pilo-rus.ru",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

async function sendToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: object
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: 0, failed: 0, error: "VAPID keys not configured" };
  }
  const webpush = getWebPush();
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  // Удаляем мёртвые подписки (410/404)
  const deadIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const status = result.reason?.statusCode;
      if (status === 410 || status === 404) deadIds.push(subscriptions[i].id);
    }
  });
  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } });
  }

  const failedCount = results.filter((r) => r.status === "rejected").length - deadIds.length;
  const sentCount = results.filter((r) => r.status === "fulfilled").length;
  return { sent: sentCount, failed: failedCount, cleaned: deadIds.length };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canAccess(session.user.role, "notifications")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const payload = await req.json();
  const { title, body, url, segment = "all" } = payload;

  if (!title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[];

  if (segment === "all") {
    subscriptions = await prisma.pushSubscription.findMany();
  } else if (segment === "registered") {
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { not: null } },
    });
  } else if (segment === "guests") {
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: null },
    });
  } else if (segment === "inactive") {
    const users = await prisma.user.findMany({
      where: {
        pushSubs: { some: {} },
        orders: { some: { createdAt: { lt: thirtyDaysAgo } } },
        NOT: { orders: { some: { createdAt: { gte: thirtyDaysAgo } } } },
      },
      select: { id: true },
    });
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
  } else if (segment === "no-orders") {
    const users = await prisma.user.findMany({
      where: { orders: { none: {} }, pushSubs: { some: {} } },
      select: { id: true },
    });
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
  } else {
    subscriptions = await prisma.pushSubscription.findMany();
  }

  const result = await sendToSubscriptions(subscriptions, {
    title,
    body,
    icon: "/icons/icon-192x192.png",
    url: url || "/",
  });

  let notificationEventId: string | undefined;
  try {
    const status = resolveNotificationStatus(result);
    const entity = normalizeNotificationEntity(payload);
    const event = await recordNotificationCenterEvent({
      channel: "PUSH",
      direction: "OUTBOUND",
      source: "ADMIN",
      sourceUserId: session.user.id,
      status,
      title,
      body,
      url: url || "/",
      segment,
      recipientUserId: typeof payload.recipientUserId === "string" ? payload.recipientUserId : null,
      recipientLabel: typeof payload.recipientLabel === "string" ? payload.recipientLabel : null,
      recipientRole: typeof payload.recipientRole === "string" ? payload.recipientRole : null,
      sentCount: result.sent,
      failedCount: result.failed,
      cleanedCount: "cleaned" in result ? result.cleaned || 0 : 0,
      error: "error" in result ? result.error || null : null,
      sentAt: status === "SENT" || status === "PARTIAL" ? new Date() : null,
      metadata: { targetCount: subscriptions.length },
      ...entity,
    });
    notificationEventId = event.id;
  } catch (error) {
    console.error("[notification-center] failed to record push event", error);
  }

  return NextResponse.json({ ...result, notificationEventId });
}
