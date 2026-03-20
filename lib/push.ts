import { prisma } from "@/lib/prisma";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

function getWebPush() {
  const webpush = require("web-push");
  webpush.setVapidDetails(
    "mailto:info@pilo-rus.ru",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

export async function sendPushToAll(payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: 0, failed: 0, error: "VAPID keys not configured" };
  }

  const webpush = getWebPush();
  const subscriptions = await prisma.pushSubscription.findMany();
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

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const webpush = getWebPush();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );
}
