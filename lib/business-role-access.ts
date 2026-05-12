import "server-only";

import { prisma } from "@/lib/prisma";
import { canAccess, type Section } from "@/lib/permissions";
import { getCurrentTenantId } from "@/lib/tenant-context";

export type BusinessRoleAccess = {
  userId: string;
  tenantId: string;
  baseRole: string | null;
  roleKeys: string[];
  actions: string[];
  scopes: string[];
  primaryRoleKey: string | null;
};

const SECTION_ACTIONS: Partial<Record<Section, string[]>> = {
  business_settings: ["business.manage", "roles.manage"],
  notifications: ["notifications.manage", "roles.manage"],
  staff: ["roles.manage"],
  orders: ["orders.manage", "orders.update", "orders.view"],
  delivery: ["orders.delivery"],
  products: ["inventory.manage", "products.manage", "content.publish_draft"],
  inventory: ["inventory.manage", "inventory.view"],
  clients: ["clients.view", "clients.contact"],
  crm: ["clients.view", "clients.contact", "tasks.assign"],
  tasks: ["tasks.assign", "tasks.update", "tasks.own.update"],
  finance: ["finance.view"],
  analytics: ["finance.view", "audiences.view"],
  promotions: ["promotions.manage", "ads.draft"],
  promotion: ["ads.draft", "audiences.view"],
  email: ["notifications.manage", "client_broadcast"],
  reviews: ["content.publish_draft"],
  posts: ["content.publish_draft"],
  services: ["content.publish_draft"],
  media: ["media.upload"],
};

function readPermissionActions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const actions = (value as { actions?: unknown }).actions;
  return Array.isArray(actions)
    ? actions.filter((item): item is string => typeof item === "string")
    : [];
}

export function canBusinessRoleAccessAction(access: BusinessRoleAccess, action: string) {
  if (access.baseRole === "SUPER_ADMIN" || access.baseRole === "ADMIN") return true;
  return access.actions.includes(action);
}

export function canBusinessRoleAccessSection(access: BusinessRoleAccess, section: Section) {
  if (access.baseRole === "SUPER_ADMIN" || access.baseRole === "ADMIN") return true;
  const actions = SECTION_ACTIONS[section] ?? [];
  return actions.some((action) => access.actions.includes(action));
}

export async function getUserBusinessRoleAccess(
  userId: string,
  tenantId = getCurrentTenantId(),
): Promise<BusinessRoleAccess> {
  const memberships = await prisma.businessRoleMember.findMany({
    where: {
      tenantId,
      userId,
      role: { isActive: true },
    },
    include: {
      role: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  const roleKeys = memberships.map((membership) => membership.role.roleKey);
  const scopes = Array.from(new Set(memberships.map((membership) => membership.role.scope)));
  const actions = Array.from(
    new Set(memberships.flatMap((membership) => readPermissionActions(membership.role.permissions))),
  );
  const primary = memberships.find((membership) => membership.isPrimary) ?? memberships[0] ?? null;

  return {
    userId,
    tenantId,
    baseRole: primary?.role.baseRole ?? null,
    roleKeys,
    actions,
    scopes,
    primaryRoleKey: primary?.role.roleKey ?? null,
  };
}

export async function canUserBusinessRoleAccessAction(
  userId: string | null | undefined,
  action: string,
  tenantId = getCurrentTenantId(),
) {
  if (!userId) return false;
  const access = await getUserBusinessRoleAccess(userId, tenantId);
  return canBusinessRoleAccessAction(access, action);
}

export async function canAccessWithBusinessRoles({
  userId,
  role,
  section,
  tenantId = getCurrentTenantId(),
}: {
  userId?: string | null;
  role?: string | null;
  section: Section;
  tenantId?: string;
}) {
  if (canAccess(role, section)) return true;
  if (!userId) return false;
  const access = await getUserBusinessRoleAccess(userId, tenantId);
  return canBusinessRoleAccessSection(access, section);
}
