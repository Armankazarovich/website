import type { NotificationDirection, NotificationSource, Prisma, TaskRelationEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  recordNotificationCenterEvent,
  resolveNotificationStatus,
  type NotificationDeliveryResult,
} from "@/lib/notification-center";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export type PushDeliveryOptions = {
  tenantId?: string;
  direction?: NotificationDirection;
  source?: NotificationSource;
  sourceUserId?: string | null;
  segment?: string | null;
  recipientUserId?: string | null;
  recipientLabel?: string | null;
  recipientRole?: string | null;
  entityType?: TaskRelationEntityType | null;
  entityId?: string | null;
  entityLabel?: string | null;
  entityHref?: string | null;
  metadata?: Prisma.InputJsonValue;
  recordEvent?: boolean;
};

type PushSendResult = NotificationDeliveryResult & {
  sent: number;
  failed: number;
  cleaned?: number;
};

const VAPID_NOT_CONFIGURED = "VAPID keys not configured";

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
): Promise<PushSendResult> {
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

function jsonObject(value: Prisma.InputJsonValue | undefined): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Prisma.InputJsonObject;
}

function missingVapidResult(): PushSendResult {
  return { sent: 0, failed: 0, cleaned: 0, error: VAPID_NOT_CONFIGURED };
}

async function recordPushDelivery(
  payload: PushPayload,
  result: PushSendResult,
  options: PushDeliveryOptions & { targetCount?: number } = {},
) {
  if (options.recordEvent === false) return;

  try {
    const status = resolveNotificationStatus(result);
    const now = new Date();
    await recordNotificationCenterEvent({
      tenantId: options.tenantId || getCurrentTenantId(),
      direction: options.direction || "OUTBOUND",
      channel: "PUSH",
      status,
      source: options.source || "SYSTEM",
      sourceUserId: options.sourceUserId || null,
      title: payload.title,
      body: payload.body,
      url: payload.url || null,
      segment: options.segment || null,
      recipientUserId: options.recipientUserId || null,
      recipientLabel: options.recipientLabel || null,
      recipientRole: options.recipientRole || null,
      sentCount: result.sent,
      failedCount: result.failed,
      cleanedCount: result.cleaned || 0,
      error: result.error || null,
      entityType: options.entityType || null,
      entityId: options.entityId || null,
      entityLabel: options.entityLabel || null,
      entityHref: options.entityHref || payload.url || null,
      metadata: {
        ...jsonObject(options.metadata),
        icon: payload.icon || null,
        targetCount: options.targetCount ?? null,
      },
      sentAt: status === "SENT" || status === "PARTIAL" ? now : null,
    });
  } catch (error) {
    console.error("[notification-center] failed to record push delivery", error);
  }
}

export async function sendPushToAll(payload: PushPayload, options: PushDeliveryOptions = {}) {
  const tenantId = options.tenantId || getCurrentTenantId();
  const subscriptions = await prisma.pushSubscription.findMany();

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    const result = missingVapidResult();
    await recordPushDelivery(payload, result, {
      tenantId,
      segment: options.segment || "all",
      ...options,
      targetCount: subscriptions.length,
    });
    return result;
  }

  const webpush = getWebPush();
  const result = await sendAndCleanup(webpush, subscriptions, payload);
  await recordPushDelivery(payload, result, {
    tenantId,
    segment: options.segment || "all",
    ...options,
    targetCount: subscriptions.length,
  });
  return result;
}

export async function sendPushToUser(userId: string, payload: PushPayload, options: PushDeliveryOptions = {}) {
  const tenantId = options.tenantId || getCurrentTenantId();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  const result = !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY
    ? missingVapidResult()
    : await sendAndCleanup(getWebPush(), subscriptions, payload);

  await recordPushDelivery(payload, result, {
    tenantId,
    segment: options.segment || "user",
    recipientUserId: userId,
    ...options,
    targetCount: subscriptions.length,
  });
  return result;
}

export async function sendPushToStaff(payload: PushPayload, options: PushDeliveryOptions = {}) {
  const tenantId = options.tenantId || getCurrentTenantId();
  // Берём подписки только сотрудников (role != USER)
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { tenantId, role: { not: "USER" } } },
  });

  const result = !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY
    ? missingVapidResult()
    : await sendAndCleanup(getWebPush(), subscriptions, payload);

  await recordPushDelivery(payload, result, {
    tenantId,
    segment: options.segment || "staff",
    recipientRole: options.recipientRole || "STAFF",
    ...options,
    targetCount: subscriptions.length,
  });
  return result;
}
