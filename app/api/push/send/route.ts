export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
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
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent: results.length - failed, failed };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, body, url, segment = "all" } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let subscriptions: { endpoint: string; p256dh: string; auth: string }[];

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

  return NextResponse.json(result);
}
