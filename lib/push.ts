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

async function sendAndCleanup(
  webpush: any,
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: object
): Promise<{ sent: number; failed: number; cleaned: number }> {
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  // Удаляем мёртвые подписки (410 Gone / 404 Not Found)
  const deadIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const status = result.reason?.statusCode;
      if (status === 410 || status === 404) {
        deadIds.push(subscriptions[i].id);
      }
    }
  });
  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } });
  }

  const failed = results.filter((r) => r.status === "rejected").length - deadIds.length;
  return { sent: results.length - results.filter((r) => r.status === "rejected").length, failed, cleaned: deadIds.length };
}

export async function sendPushToAll(payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: 0, failed: 0, error: "VAPID keys not configured" };
  }

  const webpush = getWebPush();
  const subscriptions = await prisma.pushSubscription.findMany();
  return sendAndCleanup(webpush, subscriptions, payload);
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const webpush = getWebPush();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await sendAndCleanup(webpush, subscriptions, payload);
}

export async function sendPushToStaff(payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const webpush = getWebPush();
  // Берём подписки только сотрудников (role != USER)
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: { not: "USER" } } },
  });
  await sendAndCleanup(webpush, subscriptions, payload);
}
