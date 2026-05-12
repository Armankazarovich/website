import "server-only";

import type { NotificationChannel, Prisma, Role } from "@prisma/client";
import { getDynamicNotificationRoleBlueprints } from "@/lib/dynamic-role-os";
import { prisma } from "@/lib/prisma";

export const NOTIFICATION_TENANT_ID = "pilorus";

export const STAFF_NOTIFICATION_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "ACCOUNTANT",
  "WAREHOUSE",
  "SELLER",
  "COURIER",
  "USER",
] as const satisfies readonly Role[];

export type StaffNotificationRole = (typeof STAFF_NOTIFICATION_ROLES)[number];

export const NOTIFICATION_ROLE_LABELS: Record<StaffNotificationRole, string> = {
  SUPER_ADMIN: "Супер-админ",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Склад",
  SELLER: "Продавец",
  COURIER: "Курьер",
  USER: "Клиент",
};

export type NotificationEventKey =
  | "new_order"
  | "pending_review"
  | "pending_staff"
  | "notification_issue"
  | "task_assigned"
  | "system_health"
  | "order_status"
  | "client_broadcast"
  | "aray_reminder";

export type NotificationEventDefinition = {
  key: NotificationEventKey;
  label: string;
  description: string;
  defaultRoles: readonly StaffNotificationRole[];
  defaultChannels: readonly NotificationChannel[];
};

export const NOTIFICATION_EVENT_DEFINITIONS: NotificationEventDefinition[] = [
  {
    key: "new_order",
    label: "Новый заказ",
    description: "Появился заказ, который нужно принять в работу.",
    defaultRoles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER", "WAREHOUSE", "COURIER"],
    defaultChannels: ["SYSTEM", "PUSH", "TELEGRAM"],
  },
  {
    key: "pending_review",
    label: "Отзыв на модерации",
    description: "Клиентский отзыв ждет проверки перед публикацией.",
    defaultRoles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"],
    defaultChannels: ["SYSTEM", "ARAY"],
  },
  {
    key: "pending_staff",
    label: "Заявка сотрудника",
    description: "Новый участник команды ожидает подтверждения.",
    defaultRoles: ["SUPER_ADMIN", "ADMIN"],
    defaultChannels: ["SYSTEM", "PUSH"],
  },
  {
    key: "notification_issue",
    label: "Сбой доставки",
    description: "Push, Telegram или другая отправка завершилась ошибкой.",
    defaultRoles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    defaultChannels: ["SYSTEM", "ARAY"],
  },
  {
    key: "task_assigned",
    label: "Назначена задача",
    description: "Задача назначена роли или сотруднику.",
    defaultRoles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
    defaultChannels: ["SYSTEM", "ARAY"],
  },
  {
    key: "system_health",
    label: "Системный риск",
    description: "ARAY заметил технический риск или важную проверку.",
    defaultRoles: ["SUPER_ADMIN", "ADMIN"],
    defaultChannels: ["SYSTEM", "ARAY"],
  },
  {
    key: "order_status",
    label: "Статус заказа",
    description: "Клиент получает короткое сообщение, когда заказ перешел на следующий этап.",
    defaultRoles: ["USER"],
    defaultChannels: ["PUSH", "ARAY", "EMAIL"],
  },
  {
    key: "client_broadcast",
    label: "Рассылка клиенту",
    description: "Акции, новости и полезные сообщения для подписчиков.",
    defaultRoles: ["USER"],
    defaultChannels: ["PUSH", "EMAIL"],
  },
  {
    key: "aray_reminder",
    label: "Напоминание ARAY",
    description: "ARAY напоминает о задачах, графике, доставке и важных действиях.",
    defaultRoles: ["USER", "SUPER_ADMIN", "ADMIN", "MANAGER"],
    defaultChannels: ["ARAY", "PUSH"],
  },
];

export const NOTIFICATION_EVENT_KEYS = new Set<NotificationEventKey>(
  NOTIFICATION_EVENT_DEFINITIONS.map((event) => event.key),
);

const CHANNELS = new Set<NotificationChannel>([
  "PUSH",
  "TELEGRAM",
  "EMAIL",
  "SMS",
  "SYSTEM",
  "ARAY",
]);

export type NotificationRolePolicy = {
  role: StaffNotificationRole;
  eventKey: NotificationEventKey;
  enabled: boolean;
  channels: NotificationChannel[];
  quietHoursEnabled: boolean;
  isDefault: boolean;
};

export type NotificationRoleSchedule = {
  role: StaffNotificationRole;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  weekendsMuted: boolean;
  quietActive: boolean;
};

function isStaffNotificationRole(role: unknown): role is StaffNotificationRole {
  return (
    typeof role === "string" &&
    (STAFF_NOTIFICATION_ROLES as readonly string[]).includes(role)
  );
}

export function normalizeStaffNotificationRole(role: unknown) {
  return isStaffNotificationRole(role) ? role : null;
}

export function normalizeNotificationEventKey(key: unknown) {
  return typeof key === "string" && NOTIFICATION_EVENT_KEYS.has(key as NotificationEventKey)
    ? (key as NotificationEventKey)
    : null;
}

function normalizeChannels(value: unknown, fallback: readonly NotificationChannel[]) {
  if (!Array.isArray(value)) return [...fallback];
  const channels = value.filter((channel): channel is NotificationChannel => {
    return typeof channel === "string" && CHANNELS.has(channel as NotificationChannel);
  });
  return channels.length > 0 ? channels : [...fallback];
}

function getDefaultPolicy(role: StaffNotificationRole, event: NotificationEventDefinition): NotificationRolePolicy {
  return {
    role,
    eventKey: event.key,
    enabled: event.defaultRoles.includes(role),
    channels: [...event.defaultChannels],
    quietHoursEnabled: false,
    isDefault: true,
  };
}

function normalizeTime(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function minutesOfDay(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function isQuietNow(schedule: Pick<NotificationRoleSchedule, "quietHoursEnabled" | "quietStart" | "quietEnd" | "weekendsMuted">) {
  const now = new Date();
  const day = now.getDay();
  if (schedule.weekendsMuted && (day === 0 || day === 6)) return true;
  if (!schedule.quietHoursEnabled) return false;

  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutesOfDay(schedule.quietStart);
  const end = minutesOfDay(schedule.quietEnd);

  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export async function getNotificationPoliciesForRole(role: string | null | undefined) {
  const staffRole = normalizeStaffNotificationRole(role);
  if (!staffRole) return [];

  const saved = await prisma.notificationRolePreference.findMany({
    where: { tenantId: NOTIFICATION_TENANT_ID, role: staffRole },
  });
  const savedByEvent = new Map(saved.map((item) => [item.eventKey, item]));

  return NOTIFICATION_EVENT_DEFINITIONS.map((event) => {
    const defaultPolicy = getDefaultPolicy(staffRole, event);
    const savedPolicy = savedByEvent.get(event.key);
    if (!savedPolicy) return defaultPolicy;

    return {
      role: staffRole,
      eventKey: event.key,
      enabled: savedPolicy.enabled,
      channels: normalizeChannels(savedPolicy.channels, event.defaultChannels),
      quietHoursEnabled: savedPolicy.quietHoursEnabled,
      isDefault: false,
    } satisfies NotificationRolePolicy;
  });
}

export async function getNotificationScheduleForRole(role: string | null | undefined): Promise<NotificationRoleSchedule | null> {
  const staffRole = normalizeStaffNotificationRole(role);
  if (!staffRole) return null;

  const saved = await prisma.notificationRoleSchedule.findUnique({
    where: {
      tenantId_role: {
        tenantId: NOTIFICATION_TENANT_ID,
        role: staffRole,
      },
    },
  });

  const schedule: NotificationRoleSchedule = {
    role: staffRole,
    quietHoursEnabled: saved?.quietHoursEnabled ?? false,
    quietStart: normalizeTime(saved?.quietStart, "21:00"),
    quietEnd: normalizeTime(saved?.quietEnd, "09:00"),
    weekendsMuted: saved?.weekendsMuted ?? false,
    quietActive: false,
  };

  schedule.quietActive = isQuietNow(schedule);
  return schedule;
}

export async function getNotificationSettingsMatrix() {
  const [savedPolicies, savedSchedules, businessRoles] = await Promise.all([
    prisma.notificationRolePreference.findMany({
      where: { tenantId: NOTIFICATION_TENANT_ID },
    }),
    prisma.notificationRoleSchedule.findMany({
      where: { tenantId: NOTIFICATION_TENANT_ID },
    }),
    prisma.businessRole.findMany({
      where: { tenantId: NOTIFICATION_TENANT_ID, isActive: true },
      include: {
        _count: {
          select: {
            members: true,
            notificationPreferences: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const policiesByRoleAndEvent = new Map(
    savedPolicies.map((policy) => [`${policy.role}:${policy.eventKey}`, policy]),
  );
  const schedulesByRole = new Map(savedSchedules.map((schedule) => [schedule.role, schedule]));

  const policies = STAFF_NOTIFICATION_ROLES.flatMap((role) =>
    NOTIFICATION_EVENT_DEFINITIONS.map((event) => {
      const saved = policiesByRoleAndEvent.get(`${role}:${event.key}`);
      const defaultPolicy = getDefaultPolicy(role, event);
      if (!saved) return defaultPolicy;
      return {
        role,
        eventKey: event.key,
        enabled: saved.enabled,
        channels: normalizeChannels(saved.channels, event.defaultChannels),
        quietHoursEnabled: saved.quietHoursEnabled,
        isDefault: false,
      } satisfies NotificationRolePolicy;
    }),
  );

  const schedules = STAFF_NOTIFICATION_ROLES.map((role) => {
    const saved = schedulesByRole.get(role);
    const schedule: NotificationRoleSchedule = {
      role,
      quietHoursEnabled: saved?.quietHoursEnabled ?? false,
      quietStart: normalizeTime(saved?.quietStart, "21:00"),
      quietEnd: normalizeTime(saved?.quietEnd, "09:00"),
      weekendsMuted: saved?.weekendsMuted ?? false,
      quietActive: false,
    };
    schedule.quietActive = isQuietNow(schedule);
    return schedule;
  });

  return {
    roles: STAFF_NOTIFICATION_ROLES.map((role) => ({
      key: role,
      label: NOTIFICATION_ROLE_LABELS[role],
    })),
    roleBlueprints: getDynamicNotificationRoleBlueprints(),
    businessRoleAudiences: businessRoles.map((role) => ({
      id: role.id,
      key: role.roleKey,
      label: role.label,
      baseRole: role.baseRole,
      scope: role.scope,
      roleKind: role.roleKind,
      members: role._count.members,
      preferences: role._count.notificationPreferences,
    })),
    events: NOTIFICATION_EVENT_DEFINITIONS,
    policies,
    schedules,
  };
}

export function isPolicyEnabled(policies: NotificationRolePolicy[], eventKey: NotificationEventKey) {
  return policies.find((policy) => policy.eventKey === eventKey)?.enabled ?? false;
}

export function toNotificationChannelsJson(channels: unknown): Prisma.InputJsonValue {
  return normalizeChannels(channels, ["SYSTEM"]) as Prisma.InputJsonArray;
}
