import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getNotificationPoliciesForRole,
  getNotificationScheduleForRole,
  isPolicyEnabled,
  normalizeStaffNotificationRole,
  NOTIFICATION_TENANT_ID,
  type NotificationEventKey,
} from "@/lib/notification-settings";

export type AdminNotificationFeedItemKind =
  | "new_order"
  | "order_status"
  | "pending_review"
  | "pending_staff"
  | "notification_issue"
  | "task_assigned";

export type AdminNotificationFeedItem = {
  id: string;
  kind: AdminNotificationFeedItemKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  tone: "primary" | "warning" | "danger" | "muted";
};

export type AdminNotificationFeedSummary = {
  total: number;
  newOrders: number;
  orderStatuses: number;
  pendingReviews: number;
  pendingStaff: number;
  notificationIssues: number;
  assignedTasks: number;
  quietActive: boolean;
};

export type AdminNotificationFeed = AdminNotificationFeedSummary & {
  items: AdminNotificationFeedItem[];
};

type FeedOptions = {
  take?: number;
  userId?: string | null;
  includeItems?: boolean;
};

const EMPTY_FEED: AdminNotificationFeed = {
  total: 0,
  newOrders: 0,
  orderStatuses: 0,
  pendingReviews: 0,
  pendingStaff: 0,
  notificationIssues: 0,
  assignedTasks: 0,
  quietActive: false,
  items: [],
};

function clampTake(value: unknown) {
  const take = Number(value ?? 8);
  if (!Number.isFinite(take)) return 8;
  return Math.min(Math.max(Math.floor(take), 1), 20);
}
function toDateString(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function formatMoney(value: Prisma.Decimal | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("ru-RU", {
    maximumFractionDigits: 0,
  });
}

function customerLabel(order: { guestName: string | null; guestPhone: string | null }) {
  return order.guestName || order.guestPhone || "Клиент";
}

function can(eventKey: NotificationEventKey, enabled: Set<NotificationEventKey>) {
  return enabled.has(eventKey);
}

export async function getAdminNotificationFeed(
  role: string | null | undefined,
  options: FeedOptions = {},
): Promise<AdminNotificationFeed> {
  const staffRole = normalizeStaffNotificationRole(role);
  if (!staffRole) return EMPTY_FEED;

  const take = clampTake(options.take);
  const includeItems = options.includeItems ?? true;
  const policies = await getNotificationPoliciesForRole(staffRole);
  const enabledEvents = new Set(
    policies
      .filter((policy) => policy.enabled)
      .map((policy) => policy.eventKey),
  );
  const schedule = await getNotificationScheduleForRole(staffRole);

  const newOrdersEnabled = can("new_order", enabledEvents);
  const orderStatusesEnabled = can("order_status", enabledEvents);
  const reviewsEnabled = can("pending_review", enabledEvents);
  const staffEnabled = can("pending_staff", enabledEvents);
  const issuesEnabled = can("notification_issue", enabledEvents);
  const tasksEnabled = can("task_assigned", enabledEvents) && Boolean(options.userId);

  const issueWhere = {
    tenantId: NOTIFICATION_TENANT_ID,
    status: { in: ["FAILED", "PARTIAL"] },
    archivedAt: null,
  } satisfies Prisma.NotificationCenterEventWhereInput;

  const orderStatusWhere = {
    tenantId: NOTIFICATION_TENANT_ID,
    channel: "SYSTEM",
    source: "ORDER",
    recipientRole: "STAFF",
    archivedAt: null,
    readAt: null,
  } satisfies Prisma.NotificationCenterEventWhereInput;

  const taskWhere = {
    tenantId: NOTIFICATION_TENANT_ID,
    assigneeId: options.userId || "__none__",
    status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] },
  } satisfies Prisma.TaskWhereInput;

  const [
    newOrders,
    orderStatuses,
    pendingReviews,
    pendingStaff,
    notificationIssues,
    assignedTasks,
    orderItems,
    orderStatusItems,
    reviewItems,
    staffItems,
    issueItems,
    taskItems,
  ] = await Promise.all([
    newOrdersEnabled
      ? prisma.order.count({ where: { tenantId: NOTIFICATION_TENANT_ID, status: "NEW", deletedAt: null } })
      : Promise.resolve(0),
    orderStatusesEnabled
      ? prisma.notificationCenterEvent.count({ where: orderStatusWhere })
      : Promise.resolve(0),
    reviewsEnabled
      ? prisma.review.count({ where: { tenantId: NOTIFICATION_TENANT_ID, approved: false } })
      : Promise.resolve(0),
    staffEnabled
      ? prisma.user.count({ where: { tenantId: NOTIFICATION_TENANT_ID, staffStatus: "PENDING" } }).catch(() => 0)
      : Promise.resolve(0),
    issuesEnabled
      ? prisma.notificationCenterEvent.count({ where: issueWhere })
      : Promise.resolve(0),
    tasksEnabled
      ? prisma.task.count({ where: taskWhere })
      : Promise.resolve(0),
    includeItems && newOrdersEnabled
      ? prisma.order.findMany({
          where: { tenantId: NOTIFICATION_TENANT_ID, status: "NEW", deletedAt: null },
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            orderNumber: true,
            guestName: true,
            guestPhone: true,
            totalAmount: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    includeItems && orderStatusesEnabled
      ? prisma.notificationCenterEvent.findMany({
          where: orderStatusWhere,
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            title: true,
            body: true,
            entityHref: true,
            url: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    includeItems && reviewsEnabled
      ? prisma.review.findMany({
          where: { tenantId: NOTIFICATION_TENANT_ID, approved: false },
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            name: true,
            rating: true,
            text: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    includeItems && staffEnabled
      ? prisma.user
          .findMany({
            where: { tenantId: NOTIFICATION_TENANT_ID, staffStatus: "PENDING" },
            orderBy: { createdAt: "desc" },
            take,
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
    includeItems && issuesEnabled
      ? prisma.notificationCenterEvent.findMany({
          where: issueWhere,
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            title: true,
            body: true,
            error: true,
            url: true,
            entityHref: true,
            createdAt: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    includeItems && tasksEnabled
      ? prisma.task.findMany({
          where: taskWhere,
          orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
          take,
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            updatedAt: true,
            dueDate: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const items: AdminNotificationFeedItem[] = includeItems
    ? [
        ...orderItems.map((order) => ({
          id: `order-${order.id}`,
          kind: "new_order" as const,
          title: `Заказ #${order.orderNumber}`,
          body: `${customerLabel(order)} · ${formatMoney(order.totalAmount)} ₽`,
          href: `/admin/orders/${order.id}`,
          createdAt: toDateString(order.createdAt),
          tone: "primary" as const,
        })),
        ...orderStatusItems.map((event) => ({
          id: `order-status-${event.id}`,
          kind: "order_status" as const,
          title: event.title,
          body: event.body,
          href: event.entityHref || event.url || "/admin/orders",
          createdAt: toDateString(event.createdAt),
          tone: "primary" as const,
        })),
        ...reviewItems.map((review) => ({
          id: `review-${review.id}`,
          kind: "pending_review" as const,
          title: `Отзыв ${review.rating}/5`,
          body: `${review.name || "Клиент"} · ${review.text || "Ждет модерации"}`,
          href: "/admin/reviews",
          createdAt: toDateString(review.createdAt),
          tone: "warning" as const,
        })),
        ...staffItems.map((staff) => ({
          id: `staff-${staff.id}`,
          kind: "pending_staff" as const,
          title: "Заявка сотрудника",
          body: staff.name || staff.email || "Ожидает подтверждения",
          href: "/admin/staff",
          createdAt: toDateString(staff.createdAt),
          tone: "primary" as const,
        })),
        ...issueItems.map((event) => ({
          id: `notification-${event.id}`,
          kind: "notification_issue" as const,
          title: event.status === "PARTIAL" ? "Частичная доставка" : "Сбой уведомления",
          body: event.error || event.title || event.body,
          href: event.entityHref || event.url || "/admin/notifications",
          createdAt: toDateString(event.createdAt),
          tone: "danger" as const,
        })),
        ...taskItems.map((task) => ({
          id: `task-${task.id}`,
          kind: "task_assigned" as const,
          title: task.title,
          body: task.dueDate
            ? `Срок: ${new Date(task.dueDate).toLocaleDateString("ru-RU")}`
            : task.description || "Задача ждет внимания",
          href: `/admin/tasks?task=${task.id}`,
          createdAt: toDateString(task.updatedAt),
          tone: task.priority === "URGENT" || task.priority === "HIGH" ? "warning" as const : "muted" as const,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, take)
    : [];

  const total = newOrders + orderStatuses + pendingReviews + pendingStaff + notificationIssues + assignedTasks;

  return {
    total,
    newOrders,
    orderStatuses,
    pendingReviews,
    pendingStaff,
    notificationIssues,
    assignedTasks,
    quietActive: schedule?.quietActive ?? false,
    items,
  };
}
