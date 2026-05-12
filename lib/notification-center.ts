import type {
  NotificationChannel,
  NotificationDirection,
  NotificationSource,
  NotificationStatus,
  Prisma,
  TaskRelationEntityType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isTaskRelationEntityType } from "@/lib/task-relations";

export type NotificationDeliveryResult = {
  sent?: number;
  failed?: number;
  cleaned?: number;
  error?: string | null;
};

export type CreateNotificationCenterEventInput = {
  tenantId?: string;
  direction?: NotificationDirection;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  source?: NotificationSource;
  sourceUserId?: string | null;
  title: string;
  body: string;
  url?: string | null;
  segment?: string | null;
  recipientUserId?: string | null;
  recipientLabel?: string | null;
  recipientRole?: string | null;
  sentCount?: number;
  failedCount?: number;
  cleanedCount?: number;
  error?: string | null;
  entityType?: TaskRelationEntityType | null;
  entityId?: string | null;
  entityLabel?: string | null;
  entityHref?: string | null;
  metadata?: Prisma.InputJsonValue;
  sentAt?: Date | null;
  readAt?: Date | null;
  archivedAt?: Date | null;
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  DRAFT: "Черновик",
  QUEUED: "В очереди",
  SENT: "Доставлено",
  PARTIAL: "Частично",
  FAILED: "Ошибка",
  READ: "Прочитано",
  ARCHIVED: "Архив",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  PUSH: "Push",
  TELEGRAM: "Telegram",
  EMAIL: "Email",
  SMS: "SMS",
  SYSTEM: "Система",
  ARAY: "ARAY",
};

function trimNullable(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function toCount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function resolveNotificationStatus(result: NotificationDeliveryResult): NotificationStatus {
  if (result.error) return "FAILED";
  const sent = toCount(result.sent);
  const failed = toCount(result.failed);
  if (sent > 0 && failed > 0) return "PARTIAL";
  if (sent > 0) return "SENT";
  if (failed > 0) return "FAILED";
  return "QUEUED";
}

export function normalizeNotificationEntity(input: Record<string, unknown>) {
  const entityTypeRaw = trimNullable(input.entityType);
  const entityType = entityTypeRaw && isTaskRelationEntityType(entityTypeRaw)
    ? (entityTypeRaw.toUpperCase() as TaskRelationEntityType)
    : null;
  const entityId = trimNullable(input.entityId);

  if (!entityType || !entityId) {
    return {
      entityType: null,
      entityId: null,
      entityLabel: null,
      entityHref: null,
    };
  }

  return {
    entityType,
    entityId,
    entityLabel: trimNullable(input.entityLabel),
    entityHref: trimNullable(input.entityHref) || trimNullable(input.url),
  };
}

export async function recordNotificationCenterEvent(input: CreateNotificationCenterEventInput) {
  return prisma.notificationCenterEvent.create({
    data: {
      tenantId: input.tenantId || "pilorus",
      direction: input.direction || "OUTBOUND",
      channel: input.channel || "PUSH",
      status: input.status || "QUEUED",
      source: input.source || "ADMIN",
      sourceUserId: input.sourceUserId || null,
      title: input.title.trim(),
      body: input.body.trim(),
      url: input.url || null,
      segment: input.segment || null,
      recipientUserId: input.recipientUserId || null,
      recipientLabel: input.recipientLabel || null,
      recipientRole: input.recipientRole || null,
      sentCount: input.sentCount ?? 0,
      failedCount: input.failedCount ?? 0,
      cleanedCount: input.cleanedCount ?? 0,
      error: input.error || null,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      entityLabel: input.entityLabel || null,
      entityHref: input.entityHref || null,
      metadata: input.metadata ?? {},
      sentAt: input.sentAt ?? null,
      readAt: input.readAt ?? null,
      archivedAt: input.archivedAt ?? null,
    },
  });
}
