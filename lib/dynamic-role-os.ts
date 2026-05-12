export type BusinessBaseRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "ACCOUNTANT"
  | "WAREHOUSE"
  | "SELLER"
  | "COURIER"
  | "USER";

export type BusinessRoleScope =
  | "business"
  | "team"
  | "operations"
  | "sales"
  | "finance"
  | "client"
  | "partner";

export type DynamicRoleBlueprint = {
  key: string;
  label: string;
  description: string;
  baseRole: BusinessBaseRole;
  scope: BusinessRoleScope;
  roleKind: "system" | "business-template" | "client-segment";
  permissions: string[];
  notificationEvents: string[];
  channels: string[];
};

export const BUSINESS_BASE_ROLES: readonly BusinessBaseRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "ACCOUNTANT",
  "WAREHOUSE",
  "SELLER",
  "COURIER",
  "USER",
] as const;

export const BUSINESS_ROLE_SCOPES: readonly BusinessRoleScope[] = [
  "business",
  "team",
  "operations",
  "sales",
  "finance",
  "client",
  "partner",
] as const;

export const DYNAMIC_ROLE_BLUEPRINTS: DynamicRoleBlueprint[] = [
  {
    key: "owner",
    label: "Владелец",
    description: "Деньги, риски, реклама, команда и подтверждения.",
    baseRole: "SUPER_ADMIN",
    scope: "business",
    roleKind: "business-template",
    permissions: ["business.manage", "finance.view", "ads.approve", "roles.manage", "notifications.manage"],
    notificationEvents: ["new_order", "notification_issue", "system_health", "task_assigned"],
    channels: ["SYSTEM", "PUSH", "ARAY", "TELEGRAM"],
  },
  {
    key: "branch-manager",
    label: "Управляющий филиалом",
    description: "Заказы, сотрудники, склад и локальная выручка.",
    baseRole: "MANAGER",
    scope: "operations",
    roleKind: "business-template",
    permissions: ["orders.manage", "tasks.assign", "inventory.view", "clients.view"],
    notificationEvents: ["new_order", "task_assigned", "pending_staff"],
    channels: ["SYSTEM", "PUSH", "ARAY"],
  },
  {
    key: "sales-operator",
    label: "Оператор продаж",
    description: "Заказы, клиенты, звонки, заявки и follow-up.",
    baseRole: "SELLER",
    scope: "sales",
    roleKind: "business-template",
    permissions: ["orders.view", "orders.update", "clients.contact", "tasks.update"],
    notificationEvents: ["new_order", "task_assigned", "client_broadcast"],
    channels: ["SYSTEM", "PUSH", "TELEGRAM"],
  },
  {
    key: "warehouse-lead",
    label: "Старший склад",
    description: "Остатки, сборка, отгрузка и складские задачи.",
    baseRole: "WAREHOUSE",
    scope: "operations",
    roleKind: "business-template",
    permissions: ["inventory.manage", "orders.fulfillment", "tasks.update"],
    notificationEvents: ["new_order", "task_assigned", "system_health"],
    channels: ["SYSTEM", "PUSH"],
  },
  {
    key: "field-specialist",
    label: "Специалист на выезде",
    description: "Монтаж, замеры, услуги, маршруты и фотоотчеты.",
    baseRole: "COURIER",
    scope: "operations",
    roleKind: "business-template",
    permissions: ["tasks.update", "orders.delivery", "media.upload"],
    notificationEvents: ["task_assigned", "aray_reminder"],
    channels: ["PUSH", "ARAY", "TELEGRAM"],
  },
  {
    key: "marketer",
    label: "Маркетолог",
    description: "Акции, рассылки, аудитории и рекламные черновики.",
    baseRole: "MANAGER",
    scope: "sales",
    roleKind: "business-template",
    permissions: ["promotions.manage", "audiences.view", "ads.draft", "content.publish_draft", "notifications.manage"],
    notificationEvents: ["client_broadcast", "notification_issue", "system_health"],
    channels: ["SYSTEM", "ARAY", "EMAIL"],
  },
  {
    key: "vip-client",
    label: "VIP-клиент",
    description: "Статусы заказа, персональные предложения и мягкие напоминания.",
    baseRole: "USER",
    scope: "client",
    roleKind: "client-segment",
    permissions: ["orders.own.view", "profile.own.manage", "notifications.own.manage"],
    notificationEvents: ["order_status", "client_broadcast", "aray_reminder"],
    channels: ["PUSH", "ARAY", "EMAIL"],
  },
  {
    key: "partner",
    label: "Партнер",
    description: "Партнерские заявки, выплаты, документы и общие задачи.",
    baseRole: "USER",
    scope: "partner",
    roleKind: "client-segment",
    permissions: ["partner.profile", "tasks.own.update", "documents.own.view"],
    notificationEvents: ["task_assigned", "aray_reminder"],
    channels: ["PUSH", "ARAY", "EMAIL"],
  },
];

const ROLE_KEY_PATTERN = /^[a-z0-9][a-z0-9:_-]{1,62}$/;
const CYRILLIC_ROLE_KEY_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function toBusinessRoleSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_ROLE_KEY_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeBusinessRoleKey(value: unknown) {
  if (typeof value !== "string") return null;
  const roleKey = toBusinessRoleSlug(value);
  return ROLE_KEY_PATTERN.test(roleKey) ? roleKey : null;
}

export function isBusinessBaseRole(value: unknown): value is BusinessBaseRole {
  return typeof value === "string" && (BUSINESS_BASE_ROLES as readonly string[]).includes(value);
}

export function normalizeBusinessBaseRole(value: unknown, fallback: BusinessBaseRole = "MANAGER") {
  return isBusinessBaseRole(value) ? value : fallback;
}

export function normalizeBusinessRoleScope(value: unknown, fallback: BusinessRoleScope = "business") {
  return typeof value === "string" && (BUSINESS_ROLE_SCOPES as readonly string[]).includes(value)
    ? (value as BusinessRoleScope)
    : fallback;
}

export function getDynamicRoleBlueprint(key: unknown) {
  const roleKey = normalizeBusinessRoleKey(key);
  if (!roleKey) return null;
  return DYNAMIC_ROLE_BLUEPRINTS.find((role) => role.key === roleKey) ?? null;
}

export function createRoleSeedFromBlueprint(blueprint: DynamicRoleBlueprint) {
  return {
    roleKey: blueprint.key,
    label: blueprint.label,
    description: blueprint.description,
    baseRole: blueprint.baseRole,
    scope: blueprint.scope,
    roleKind: blueprint.roleKind,
    permissions: {
      actions: blueprint.permissions,
      baseRole: blueprint.baseRole,
      scope: blueprint.scope,
    },
    notificationSeed: {
      events: blueprint.notificationEvents,
      channels: blueprint.channels,
    },
  };
}

export function getDynamicRoleBlueprints() {
  return DYNAMIC_ROLE_BLUEPRINTS.map((role) => ({ ...role }));
}

export function getDynamicNotificationRoleBlueprints() {
  return DYNAMIC_ROLE_BLUEPRINTS.map(({ key, label, description, baseRole, scope, roleKind, notificationEvents, channels }) => ({
    key,
    label,
    description,
    baseRole,
    scope,
    roleKind,
    notificationEvents,
    channels,
  }));
}
